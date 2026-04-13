# BreachLab Platform — Plan 06: Public Profiles + Discord OAuth + Role-sync

**Goal:** After this plan, any user has a public page at `/u/:username` showing ASCII avatar, solved tracks, badges, speedrun records, total points, joined date. Logged-in users can link a Discord account from the dashboard via OAuth2. A standalone role-sync script (run manually or via cron) syncs Discord roles based on user state (first blood, track complete, supporter). All Discord code is gated behind env vars so the app works without credentials.

**Architecture:**
- Schema: `users` adds `discordId`, `discordUsername`, `isSupporter`. New `discordOauthStates` table for CSRF state tokens.
- Discord OAuth2 flow: `/api/auth/discord/start` generates state + redirects to Discord. `/api/auth/discord/callback` validates state, exchanges code for access token, fetches user, stores `discord_id`.
- Profile page: server component at `/u/[username]/page.tsx`, one query aggregates everything.
- ASCII avatar: pure function `asciiAvatar(username)` — deterministic 6-line ASCII art from SHA256 of username. No image.
- Role-sync bot: `scripts/sync-discord-roles.ts` — standalone tsx script. Reads users with `discord_id` set, computes expected roles from DB state, calls Discord REST API to add/remove roles. Designed to run via cron later; for now manual `npx tsx scripts/sync-discord-roles.ts`.

**Tech stack additions:** none — we use `fetch` directly against Discord REST API (no SDK). `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_ROLE_SUPPORTER`, `DISCORD_ROLE_FIRST_BLOOD`, `DISCORD_ROLE_GHOST_MASTER` env vars (all optional — code must no-op gracefully when missing).

**Out of scope:** real-time role updates via Discord gateway (bot as long-running process), Discord slash commands, automatic sync on every submission (we sync on demand only in v1), profile customization (bio, avatar override).

---

## File structure

```
breachlab-platform/
├── drizzle/0004_discord_and_profiles.sql
├── src/
│   ├── lib/
│   │   ├── db/schema.ts                   -- +users.discordId/discordUsername/isSupporter, +discordOauthStates
│   │   ├── discord/
│   │   │   ├── oauth.ts                   -- buildAuthUrl, exchangeCode, fetchUser (env-gated)
│   │   │   ├── roles.ts                   -- computeExpectedRoles(user, badges), syncUserRoles(userId)
│   │   │   └── client.ts                  -- discordFetch(path) — env-gated REST wrapper
│   │   ├── profiles/
│   │   │   └── queries.ts                 -- getProfileByUsername — aggregate everything for /u/:username
│   │   └── avatar/
│   │       └── ascii.ts                   -- asciiAvatar(username) pure fn
│   ├── app/
│   │   ├── u/[username]/page.tsx          -- public profile page
│   │   ├── api/auth/discord/
│   │   │   ├── start/route.ts
│   │   │   └── callback/route.ts
│   │   └── dashboard/
│   │       └── discord-actions.ts         -- server actions for unlink
│   └── components/
│       ├── profile/
│       │   ├── ProfileHeader.tsx          -- ASCII avatar + username + join date
│       │   ├── ProfileStats.tsx           -- points, badges, solved count
│       │   └── ProfileBadges.tsx          -- badge pills
│       └── dashboard/
│           └── DiscordLinkCard.tsx        -- link/unlink UI
├── scripts/
│   └── sync-discord-roles.ts              -- standalone role-sync script
└── tests/
    ├── unit/
    │   ├── avatar/ascii.test.ts           -- determinism, length, safe chars
    │   ├── discord/roles.test.ts          -- computeExpectedRoles matrix
    │   └── profiles/queries.test.ts       -- query shape
    └── e2e/
        └── profiles.spec.ts               -- public profile renders + 404 for unknown
```

---

## Task 1: Schema additions

**Files:** `src/lib/db/schema.ts` + new migration.

Append to `users`:
```ts
discordId: text("discord_id").unique(),
discordUsername: text("discord_username"),
isSupporter: boolean("is_supporter").notNull().default(false),
```

Add new table:
```ts
export const discordOauthStates = pgTable("discord_oauth_states", {
  state: text("state").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Generate migration, apply, commit. Existing 55 unit tests must still pass.

---

## Task 2: ASCII avatar (TDD)

**Files:** `src/lib/avatar/ascii.ts`, `tests/unit/avatar/ascii.test.ts`.

Pure function `asciiAvatar(username: string): string[]` — returns 6 lines (7 chars each, monospace-friendly). Implementation: SHA256(username) → 16 nibbles → pick chars from a safe set `[' ', '#', '*', '+', '.', '/', '\\', '|', '-']`. Deterministic.

Tests:
- Same input → same output.
- Length: 6 lines, each 7 chars.
- All chars from safe set.
- Different usernames → different avatars (weak test: at least 2 different ones differ).

---

## Task 3: Profile queries

**Files:** `src/lib/profiles/queries.ts`.

One function `getProfileByUsername(username: string)` → returns `{ user: { id, username, joinedAt, isSupporter, discordUsername | null }, totalPoints, solvedLevels: number, badges: BadgeRow[], speedruns: Array<{ trackSlug: string; totalSeconds: number; reviewStatus: string }> } | null`.

- `user` lookup case-insensitive on username. Returns null if not found.
- `totalPoints` = sum of `submissions.pointsAwarded`.
- `solvedLevels` = count of submissions.
- `badges` = all non-revoked badges (query the `badges` table, same shape as existing `getBadgesForUser`).
- `speedruns` = closed runs for this user, `reviewStatus != 'rejected'`, ordered by totalSeconds ASC.

Unit test stub in `tests/unit/profiles/queries.test.ts` — one happy-path against a manually-seeded DB row would require integration; instead assert the function is exported and has the right signature. (Full coverage via e2e in Task 11.)

---

## Task 4: Public profile page

**Files:** `src/app/u/[username]/page.tsx`, `src/components/profile/*`.

Server component. Calls `getProfileByUsername(params.username)`. If null → `notFound()`. Otherwise renders:
- `<ProfileHeader>` — ASCII avatar in a `<pre>` (amber), `@username`, "Joined YYYY-MM-DD", optional `(supporter)` pill, optional Discord link `discord.com/users/:id` if linked.
- `<ProfileStats>` — total points, levels solved, first-blood count (derive from badges).
- `<ProfileBadges>` — existing `BadgePill` components.
- A "Speedruns" section listing each closed run with track name + MM:SS.

No SSR-disabled dynamics — pure static render from query. Must render correctly for a user with zero submissions (empty state rows).

---

## Task 5: Discord OAuth — client + start route

**Files:** `src/lib/discord/client.ts`, `src/lib/discord/oauth.ts`, `src/app/api/auth/discord/start/route.ts`.

`client.ts`: `discordFetch(path, init)` — wraps `fetch('https://discord.com/api/v10' + path, { ...init })` with common error handling. Throws `Error("discord not configured")` if `DISCORD_BOT_TOKEN` (or relevant creds) missing and operation needs them.

`oauth.ts`:
- `isConfigured(): boolean` — checks `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` env vars.
- `buildAuthUrl(state: string): string` — returns `https://discord.com/oauth2/authorize?client_id=...&response_type=code&scope=identify&state=...&redirect_uri=${SITE_URL}/api/auth/discord/callback`.
- `exchangeCode(code: string): Promise<{ accessToken: string; tokenType: string }>` — POST to `/api/v10/oauth2/token` with client creds.
- `fetchUser(accessToken: string): Promise<{ id: string; username: string }>` — GET `/api/v10/users/@me` with bearer token.

`start/route.ts`:
- GET handler. Requires session (getCurrentSession); otherwise 401.
- If `!isConfigured()` → return JSON `{ error: "Discord not configured" }` with 503.
- Generate random state via `nanoid` or `crypto.randomBytes(16).toString("hex")`.
- Insert `discord_oauth_states` row: state, userId.
- `NextResponse.redirect(buildAuthUrl(state))`.

---

## Task 6: Discord OAuth — callback route

**Files:** `src/app/api/auth/discord/callback/route.ts`.

GET handler:
1. Read `code` and `state` from URL query. If missing → redirect to `/dashboard?discord=error`.
2. Look up `discord_oauth_states` by state. If not found or older than 10 minutes → `/dashboard?discord=invalid_state`.
3. Delete the state row (single-use).
4. `getCurrentSession()` — user must match `state.userId`.
5. `exchangeCode(code)` → access token.
6. `fetchUser(accessToken)` → `{ id, username }`.
7. Check for conflict: another user with `discordId = id` that's not the current user → `/dashboard?discord=conflict`.
8. `UPDATE users SET discord_id=id, discord_username=username WHERE id = session.user.id`.
9. Redirect to `/dashboard?discord=linked`.

All env-gated: if `!isConfigured()` return 503. If any Discord fetch fails, redirect with `discord=error`.

---

## Task 7: Dashboard Link Discord UI + unlink action

**Files:** `src/components/dashboard/DiscordLinkCard.tsx`, `src/app/dashboard/discord-actions.ts`, wire into `src/app/dashboard/page.tsx`.

`DiscordLinkCard`:
- Takes `discordUsername: string | null` and `configured: boolean` as props.
- If `!configured`: grey "Discord linking not available" line.
- If `configured && !discordUsername`: `<a href="/api/auth/discord/start">` styled "Link Discord" button.
- If linked: shows `@discordUsername` and a `<form action={unlinkDiscord}>` with a "Unlink" button.
- Also reads query string for `discord=linked|error|conflict|invalid_state` and renders a flash message (client side, `useSearchParams`).

`discord-actions.ts`:
- `"use server"`
- `unlinkDiscord()` — requires session. `UPDATE users SET discord_id=NULL, discord_username=NULL`. `revalidatePath("/dashboard")`.

Dashboard page passes `isConfigured()` result + user.discordUsername to the card.

---

## Task 8: Role-sync library (TDD)

**Files:** `src/lib/discord/roles.ts`, `tests/unit/discord/roles.test.ts`.

Pure function:
```ts
export function computeExpectedRoles(input: {
  isSupporter: boolean;
  hasFirstBlood: boolean;
  hasTrackComplete: boolean;
}, roleIds: {
  supporter: string | null;
  firstBlood: string | null;
  ghostMaster: string | null;
}): string[] {
  const out: string[] = [];
  if (input.isSupporter && roleIds.supporter) out.push(roleIds.supporter);
  if (input.hasFirstBlood && roleIds.firstBlood) out.push(roleIds.firstBlood);
  if (input.hasTrackComplete && roleIds.ghostMaster) out.push(roleIds.ghostMaster);
  return out;
}
```

Tests: matrix of 8 combinations + role-id nullability handling.

Plus stub `syncUserRoles(userId: string): Promise<void>` — reads the user's badges + is_supporter from DB, computes expected roles, diffs against current member roles fetched from Discord (`GET /guilds/:guild_id/members/:user_id`), PATCHes the member. Env-gated. No unit tests — covered by integration (manual).

---

## Task 9: Standalone role-sync script

**Files:** `scripts/sync-discord-roles.ts`.

```
npx tsx scripts/sync-discord-roles.ts [--user <username>]
```

- Without args: iterates all users where `discord_id IS NOT NULL`, calls `syncUserRoles(user.id)` for each, logs progress.
- With `--user X`: just that one.
- Exits 1 if Discord not configured.
- Designed to be run manually or later via cron.

No tests — it's a glue script.

---

## Task 10: E2E spec

**Files:** `tests/e2e/profiles.spec.ts`.

- Seed 1 track + 2 levels + 1 user with badges.
- Visit `/u/<username>` → expect 200 + ASCII avatar visible + badge pills visible + joined date visible.
- Visit `/u/nonexistent` → expect 404.
- Visit own profile while logged in — should still render publicly (same as anonymous).
- Discord link/unlink flows are NOT e2e tested (they require real Discord credentials). Cover via unit tests on `computeExpectedRoles` + manual QA checklist in the PR note.

---

## Task 11: Sanity + tag

- `npm test && DATABASE_URL=... npm run test:e2e`
- `git tag v0.6.0-profiles-discord`
- Push main + tag
- Update Obsidian changelog

---

## Spec coverage

- Public profiles → Tasks 2, 3, 4, 10
- Discord OAuth link → Tasks 5, 6, 7
- Role sync bot → Tasks 8, 9
- `is_supporter` wiring → Task 1 (column) + Task 8 (role) — actual flip happens in Plan 07 (BTCPay webhook).

## Notes for executor

- Every Discord-touching code path must no-op gracefully when `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `DISCORD_BOT_TOKEN` are missing. Use `isConfigured()` as the gate.
- Do NOT add a long-running Discord bot process — the role sync is a script-on-demand. This keeps the deployment model simple (same Next.js container, no extra worker).
- `discord_oauth_states` is a per-user CSRF table. Expire rows older than 10 minutes at read time; a periodic cleanup is nice-to-have but out of scope.
- Public profile page must work with zero data (new user with no submissions yet) — don't crash on empty arrays.
