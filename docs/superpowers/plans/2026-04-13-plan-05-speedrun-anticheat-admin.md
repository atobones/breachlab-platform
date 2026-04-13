# BreachLab Platform — Plan 05: Speedrun + Anti-cheat + Admin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the speedrun leaderboard (time from first submission to last submission per track), anti-cheat signals (min-time thresholds, suspicious flagging), and an admin dashboard (2FA-gated) with a review queue for suspicious runs. After this plan, `/leaderboard/speedrun` becomes a real tab, a new `speedrun_top10` badge can be awarded manually by admins, and any user with the `is_admin` flag can log in to `/admin` and approve or reject runs.

**Architecture:** One new table `speedrun_runs` tracking `started_at`, `finished_at`, `total_seconds`, `is_suspicious`, `review_status`, `reviewed_by`. Logic lives in `src/lib/speedrun/`. Hooks into `submitFlag` at two points: (a) first ever submission of the user on a track → create `speedrun_runs` row with `started_at`, (b) submission that completes the track (track_completed already computed in Plan 04) → close the row with `finished_at` and run anti-cheat checks. Admin panel is a single `/admin` page behind a server-side guard requiring `users.is_admin = true` AND `totpEnabled`. Listing of suspicious runs, approve/reject actions.

**Tech Stack additions:** None.

**Out of scope:** Redis-based rate limiting, distributed anti-cheat, historical backfill of speedrun data (existing Ghost submissions don't retroactively become runs). Supporter badge and Discord role sync are Plans 06/07.

---

## File structure

```
breachlab-platform/
├── drizzle/0003_speedrun_runs_and_admin.sql
├── src/
│   ├── lib/
│   │   ├── db/schema.ts                            -- +speedrun_runs table, +users.is_admin column
│   │   └── speedrun/
│   │       ├── hooks.ts                            -- startRun / closeRun / detectSuspicious
│   │       ├── queries.ts                          -- getTopSpeedruns, getSuspiciousRuns
│   │       └── thresholds.ts                       -- per-track minimum seconds table
│   ├── app/
│   │   ├── leaderboard/speedrun/page.tsx           -- REPLACE stub with real table
│   │   └── admin/
│   │       ├── page.tsx                            -- redirect to /admin/review
│   │       ├── layout.tsx                          -- admin guard
│   │       └── review/
│   │           ├── page.tsx                        -- list of suspicious runs
│   │           └── actions.ts                      -- approveRun, rejectRun
│   └── components/
│       ├── admin/
│       │   └── ReviewQueueTable.tsx
│       └── speedrun/
│           └── SpeedrunTable.tsx
└── tests/
    └── unit/
        └── speedrun/
            ├── thresholds.test.ts
            └── detect.test.ts
```

---

## Task 1: Schema additions

**Files:** `src/lib/db/schema.ts`, new migration

Add `is_admin` column to `users`. Add new `speedrun_runs` table.

- [ ] Append to schema:

```ts
// in users table:
// isAdmin: boolean("is_admin").notNull().default(false),

export const speedrunRuns = pgTable("speedrun_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  trackId: uuid("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  totalSeconds: integer("total_seconds"),
  isSuspicious: boolean("is_suspicious").notNull().default(false),
  reviewStatus: text("review_status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export type SpeedrunRun = typeof speedrunRuns.$inferSelect;
```

Add `isAdmin` to the `users` `pgTable` definition: `isAdmin: boolean("is_admin").notNull().default(false),`.

Generate migration, apply, commit.

---

## Task 2: Thresholds table (TDD)

**Files:** `src/lib/speedrun/thresholds.ts`, test

Hard-coded per-track minimum seconds. Sum of min-seconds across all public levels. First version: Ghost = 900 seconds (15 min) for 22 levels. Phantom/Specter/etc = 0 until we have their content.

Simple:

```ts
export const MIN_TRACK_SECONDS: Record<string, number> = {
  ghost: 900,
};

export function minSecondsForTrack(slug: string): number {
  return MIN_TRACK_SECONDS[slug] ?? 0;
}
```

Tests: returns 900 for ghost, 0 for unknown slug.

---

## Task 3: Hooks (TDD pure logic)

**Files:** `src/lib/speedrun/hooks.ts`, `tests/unit/speedrun/detect.test.ts`

Pure function `isSuspicious({ totalSeconds, minSeconds })` — returns true when `totalSeconds < minSeconds`. DB-touching wrappers `startRun(userId, trackId)` and `closeRun(runId, finishedAt, trackSlug)` call it.

```ts
export function isSuspicious(args: {
  totalSeconds: number;
  minSeconds: number;
}): boolean {
  return args.totalSeconds < args.minSeconds;
}
```

Plus `startRun` / `closeRun` / `findOpenRun` DB helpers — straightforward inserts/updates.

---

## Task 4: Wire into submitFlag

**Files:** `src/lib/tracks/submit.ts`

Extend:
- On first submission of user on this track (`solvedInTrack.length === 1` right after insert) → `startRun(userId, trackId)`.
- On submission that brings `solvedInTrack.length` to the public-level count (track complete) → `closeRun(run.id, now, trackSlug)`.
- The close step computes `totalSeconds`, fetches `minSecondsForTrack(slug)`, sets `isSuspicious` via pure function, writes to DB.

Ordering: badge award already happens here. Speedrun handling goes in the same block.

---

## Task 5: Speedrun queries

**Files:** `src/lib/speedrun/queries.ts`

- `getTopSpeedruns(slug, limit)` — joins `speedrun_runs` → `tracks` by slug, `users` for username, filters `review_status != 'rejected'`, orders by `total_seconds ASC`, returns `{ username, totalSeconds, isSuspicious, awardedAt }`.
- `getSuspiciousRuns()` — everything with `is_suspicious = true` AND `review_status = 'pending'`.

---

## Task 6: /leaderboard/speedrun page

**Files:** `src/app/leaderboard/speedrun/page.tsx`, `src/components/speedrun/SpeedrunTable.tsx`

Replace stub. Query `getTopSpeedruns('ghost', 100)`. Render table: rank, operative, time (`MM:SS`), status (approved/pending/suspicious). Nav tabs mirror the existing leaderboard (Global / Speedrun active / First Bloods).

---

## Task 7: Admin guard

**Files:** `src/app/admin/layout.tsx`

Server component. Reads `getCurrentSession()`. If no user, no `isAdmin`, or `!totpEnabled` → `notFound()` (deliberately 404 so the endpoint is not discoverable). Otherwise renders a minimal admin header + `{children}`.

---

## Task 8: /admin/review page

**Files:** `src/app/admin/review/page.tsx`, `actions.ts`, `ReviewQueueTable.tsx`

Query `getSuspiciousRuns()`. Table with operative, track, totalSeconds, startedAt, approve/reject buttons. Server actions:

- `approveRun(runId)` → set `review_status='approved'`, `reviewed_by`, `reviewed_at`
- `rejectRun(runId)` → set `review_status='rejected'`

Return revalidated page.

---

## Task 9: /admin redirect

**Files:** `src/app/admin/page.tsx`

Simple `redirect('/admin/review')`.

---

## Task 10: Bootstrap admin seed

**Files:** `scripts/make-admin.ts`

Small helper script: `npx tsx scripts/make-admin.ts <username>` → sets `is_admin = true` on that user. Gate: must already exist. Used once during manual testing, and as the production bootstrap path (no UI for creating admins in v1, deliberately).

---

## Task 11: E2E spec

**Files:** `tests/e2e/speedrun.spec.ts`

- Seed track + 2 levels.
- Register user.
- Submit flag 1 → check `speedrun_runs` has open row with `started_at` set.
- Submit flag 2 (track complete) → row closed with `finished_at`, `total_seconds > 0`.
- Visit `/leaderboard/speedrun` → user appears.
- Visit `/admin/review` as non-admin → 404.
- Mark user as admin + enable 2FA via direct SQL, visit `/admin/review` → sees the run (if suspicious) or empty state.

---

## Task 12: Final sanity + tag

- `npm test && DATABASE_URL=... npm run test:e2e`
- Tag `v0.5.0-speedrun`
- Push main + tags
- Update Obsidian Changelog

---

## Spec coverage

- Speedrun leaderboard (Plan 03 deferred) → Tasks 5, 6
- Anti-cheat min-time + admin review → Tasks 2, 3, 4, 7, 8
- Admin panel with TOTP gate → Tasks 7, 8, 9
- `speedrun_top10` badge is NOT auto-awarded here — admin awards it manually from the review page (adds `badges` row). That interaction is a small add inside `approveRun`.

## Notes for executor

- `speedrun_top10` badge: extend `approveRun` to also insert a `badges` row of kind `speedrun_top10` if the run's `total_seconds` puts it in top 10. That check runs inline.
- First-blood bonus and `track_complete` badge are already awarded in Plan 04 — do not touch that flow.
- Session verification against SSH access logs is described in the main design spec but is **out of scope for this plan** — it requires syncing `ssh_sessions` from the Ghost container and adds operational complexity. v1 ships with only the threshold + admin review approach.
