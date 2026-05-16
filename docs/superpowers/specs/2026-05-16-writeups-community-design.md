# Community Writeups Design — v1

**Date:** 2026-05-16
**Status:** Draft, pending Boss review
**Owner:** Ato
**Triggered by:** 0Xm!$k publishing https://0xm1sk.github.io/breachlab-docs/ + Boss's public commit "BreachLab Notes is going in our /writeups tab". ChrisDewa adjacent thread on Discord-roles colour-coding indirectly seeded the social-recognition layer.

## Problem

Today `/writeups` shows file-based markdown walkthroughs authored by Ato only. Community members (0Xm!$k first) are producing high-quality external knowledge bases but have no surface to feature them with attribution + traffic-back. Without this surface:

- Authors get no platform recognition for community contribution.
- Players lose discoverability of valuable external resources.
- Boss's public promise to 0Xm!$k goes unfulfilled.

## Goals

1. List community-contributed writeups on `/writeups` with full author attribution and tap-link to the author's external site.
2. Allow logged-in operators to rate writeups via toggleable stars.
3. Treat Boss/curator stars with ×10 weight and surface a "Featured by Ato" badge for curated picks.
4. Gate Phantom-track writeups behind level completion (zero spoiler risk); keep Ghost-track writeups fully open.
5. Self-serve submission flow with Boss approval queue.
6. Do not break existing file-based Ato-curated writeups (they coexist).

## Non-goals (v1)

- Mirroring external content into platform markdown (v2 roadmap).
- Author profile rich pages with social proof beyond bio + site + writeups list.
- Comments / discussions on writeups.
- Per-writeup view counts (can add later if needed).
- Author edit-after-approve UI (re-submit via Discord for v1).
- Multi-curator coordination (only Boss has `is_curator` for v1).

## Locked decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Content model** = link-out card (v1), mirror (v2 backlog) | Ship fast on Boss's public commit; mirror is +2-3 days of ingest plumbing |
| 2 | **Multi-writeup per level** | Different authors = different methodologies, all valuable |
| 3 | **Star eligibility** = any logged-in user (+1), curator (+10), **subject to the same per-track gating as reading** (Ghost=logged-in, Phantom=completed-this-level) | Brigading risk diluted by curator weight; gating reused so non-completers can't rate writeups they can't even see |
| 4 | **Ingest** = self-serve `/writeups/submit` → Boss approval queue | Author writes their own copy; Boss controls quality |
| 5 | **Gating** = Ghost open (incl. anonymous), Phantom gated by THIS level's completion | Retrospective-only protects recon/deduction; matches Boss's public commit to 0Xm!$k |
| 6 | **Author model** = extend `users` table (`site_url`, `author_bio`, `is_curator`) | One table, no orphan author rows, integrates with existing auth |
| 7 | **First contributor** = 0Xm!$k (`https://0xm1sk.github.io/breachlab-docs/`) | Ghost L1-L21 + part Phantom already published |

## Out-of-scope clarifications

- "Featured by Ato" badge currently equals `BOOL_OR(u.is_curator)` over the writeup's stars. Anyone with `is_curator=true` triggers Featured. Boss sets `is_curator=true` on his own row post-migration. No automation for granting curator status.
- File-based curated writeups (existing `content/writeups/*.md`) are surfaced under a derived `getCuratedAuthor() = { username:"Ato", siteUrl:"https://breachlab.io", bio:"Founder" }` helper. No content migration to DB.

## Architecture

### Schema additions

```ts
// src/lib/db/schema.ts — extend existing users table
export const users = pgTable("users", {
  // ...existing columns...
  siteUrl: text("site_url"),
  authorBio: text("author_bio"),
  isCurator: boolean("is_curator").notNull().default(false),
});

// new
export const writeups = pgTable("writeups", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  trackSlug: text("track_slug").notNull(),
  levelIdx: integer("level_idx").notNull(),
  title: text("title").notNull(),
  brief: text("brief").notNull(),
  externalUrl: text("external_url").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
}, (t) => ({
  uniqAuthorLevel: uniqueIndex("writeups_author_track_level_uniq")
    .on(t.authorId, t.trackSlug, t.levelIdx),
  byTrackLevel: index("writeups_track_level_idx").on(t.trackSlug, t.levelIdx, t.status),
}));

export const writeupStars = pgTable("writeup_stars", {
  writeupId: uuid("writeup_id").notNull().references(() => writeups.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.writeupId, t.userId] }),
  byWriteup: index("writeup_stars_writeup_idx").on(t.writeupId),
}));
```

### Weighted score (query-side, not stored)

```sql
SELECT
  w.id,
  COUNT(*) FILTER (WHERE u.is_curator = false) AS regular_stars,
  COUNT(*) FILTER (WHERE u.is_curator = true)  AS curator_stars,
  COUNT(*) FILTER (WHERE u.is_curator = false)
    + 10 * COUNT(*) FILTER (WHERE u.is_curator = true) AS weighted_score,
  BOOL_OR(u.is_curator) AS is_featured
FROM writeups w
LEFT JOIN writeup_stars s ON s.writeup_id = w.id
LEFT JOIN users u ON u.id = s.user_id
WHERE w.status = 'approved'
GROUP BY w.id;
```

### Migration

Single Drizzle migration `<ts>_writeups_community.sql`:

1. `ALTER TABLE users ADD COLUMN site_url text, ADD COLUMN author_bio text, ADD COLUMN is_curator boolean NOT NULL DEFAULT false`
2. `CREATE TABLE writeups (...)` + indexes
3. `CREATE TABLE writeup_stars (...)` + indexes
4. Post-migration one-liner: `UPDATE users SET is_curator = true WHERE username = '<boss-username>'` (run manually after migration applies)

No data backfill needed.

## Pages and routes

| Route | State | Purpose |
|---|---|---|
| `/writeups` | modify | Index. 2 sections: "Curated by Ato" (file-based, current) + "Community writeups" (DB, sorted by weighted_score desc). Filter by track. |
| `/writeups/[track]/[level]` | modify | List of writeup cards for that level. File-based renders inline as today. DB-based shows `<WriteupCard>`s. |
| `/writeups/submit` | new | Logged-in form: track / level / title / brief / externalUrl. Pre-fills site_url/bio if user already set. POST → status=pending. |
| `/writeups/by/[username]` | new | Author profile: avatar + bio + site link + approved writeups list + total stars received. |
| `/admin/writeups` | new | Curator-only: pending queue + Approve/Reject(reason) actions. |

## Components

- `<WriteupCard>` — RSC for static parts; embeds `<StarButton>` client component.
  - Shows: author avatar+name (link to author page), title, brief, weighted score, "Featured by Ato" badge if `is_featured`, external-link CTA with favicon, lock variant for gated.
- `<StarButton>` — client component, optimistic toggle, POST/DELETE `/api/writeups/[id]/star`.
- `<AuthorTile>` — compact chip (avatar + name + tap-link to `/writeups/by/[username]`).
- `<WriteupSubmitForm>` — client form; track/level dropdowns from `tracks`/`levels`; validation; char counts.

## API routes

| Method | Route | Auth | Action |
|---|---|---|---|
| POST | `/api/writeups/submit` | logged-in | Create row, status=pending. Enforces submit rate limit. |
| POST | `/api/writeups/[id]/star` | logged-in + level-completed (Ghost = logged-in only) | Insert star (idempotent on dup). |
| DELETE | `/api/writeups/[id]/star` | logged-in | Remove star (idempotent on missing). |
| POST | `/api/admin/writeups/[id]/approve` | curator | Set status=approved, reviewedAt/By. |
| POST | `/api/admin/writeups/[id]/reject` | curator | Set status=rejected, reviewedAt/By, rejectionReason. |

## Coexistence with file-based system

`src/lib/writeups.ts` (`listWriteups`, `loadWriteup`) is **not modified**. Index and per-level pages call BOTH `listWriteups()` (file-based) and a new `listCommunityWriteups()` (DB) and merge the results.

Conflict resolution: a file-based writeup for `(phantom, 9)` and a DB-based writeup for `(phantom, 9, author=Antropy)` simply render as two separate cards on the same per-level page. Different authors, different methodologies — by design.

File-based author derivation: `getCuratedAuthor() → { username:"Ato", siteUrl:"https://breachlab.io", bio:"Founder", isCurator:true }`. Hardcoded in one helper. No DB rows for synthetic authors.

## Gating matrix

| Track | Anonymous | Logged-in, no completion of this level | Logged-in, completed this level | Curator |
|---|---|---|---|---|
| Ghost | ✅ full read | ✅ full read | ✅ full read | ✅ full read |
| Phantom / Specter / Phantom-deep | ⚠️ locked tile (title + author chip + lock icon, no brief, no URL) | ⚠️ locked tile | ✅ full read | ✅ full read |

Star button is **disabled** on locked writeups (gray + tooltip). Server-side API also enforces (returns 403 if user lacks completion for non-Ghost track).

## Error handling and anti-abuse

- DB unreachable → render empty community section, log to journald; file-based section still works.
- Invalid externalUrl → client-side form validation + server 400.
- Submit rate: max 5 per hour per user → 429 if exceeded.
- One pending writeup per (author, track, level) — resubmit overrides pending only (not approved/rejected).
- Author edit after approve: not in v1; ping Boss in Discord, he updates via admin/SQL.
- Curator brigading: not realistic for v1 (only Boss has the flag).

## Testing

- **Unit**: gating predicate (track + level + completion → access decision), score aggregation query helper (with mocked DB rows).
- **Integration**: API routes via existing platform test harness — happy paths + 403/429/400 cases for submit / star / approve / reject.
- **Manual E2E pre-deploy**:
  1. As Boss: submit, approve, star a Ghost writeup. Confirm Featured badge appears.
  2. As non-completer: open Phantom level page, see locked tile (no brief / no URL).
  3. As completer: see full card, can star/unstar, weighted score updates.

Test framework: use whatever project already uses (verify in plan phase — likely `vitest` based on Next.js conventions).

## Deploy

Single PR `feat(writeups): community contributions + stars + author profiles`:

1. Drizzle migration (schema additions).
2. New API routes.
3. New + modified pages.
4. New components.
5. No env vars needed.

Post-merge steps:
- `pnpm drizzle:migrate` on prod (or whatever migration command project uses).
- One-liner SQL: `UPDATE users SET is_curator=true WHERE username='<boss>'`.
- Boss submits 0Xm!$k's writeups via Discord-confirmed handle (Discord username already maps to platform user — confirm in plan phase).
- Boss approves them.
- Boss DM's 0Xm!$k that his work is live.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| File-based + DB writeups collide visually | Section headers ("Curated by Ato" / "Community") clarify; per-level page sorts curated first, then community by score |
| Author submits link to malicious URL | Approval queue catches; rejected writeups remain in DB with reason for audit |
| Anonymous Ghost-writeup traffic to Ato's links balloons | Acceptable — Ghost is free-tier knowledge surface anyway |
| Submit form spammed | Rate limit (5/hour) + admin queue absorption |
| Discord-handle ↔ platform-username mismatch for 0Xm!$k | Boss confirms in Discord before manually inserting author row; v1 doesn't require Discord linkage |

## Open questions for plan phase (not blockers)

- Exact migration command (drizzle-kit push vs migration files) — check `package.json` scripts.
- Existing test framework (vitest / jest / none) — pick from `package.json`.
- Avatar source — Discord avatar URL or initials fallback?
- Favicon source for external-link CTA — fetch from `<url>/favicon.ico` server-side OR use a simple icon, no fetch?
