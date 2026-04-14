# Ghost 2.0 Completion Plan

**Context:** Ghost 2.0 content expansion (9 → 23 levels, including hidden bonus at idx 22) already shipped in commit `427f2b1`. Acceptance audit vs `docs/superpowers/specs/2026-04-13-ghost-2-content-expansion.md` shows 3 gaps remain:

1. **`ghost_graduate` badge kind** is not in `BadgeKind` union (spec line 110).
2. **Badge award logic** does not fire when a user submits the level-22 flag.
3. **Level 21 hint** — spec says `/tracks/ghost/21` should hint at something more without spoiling it. Current content doesn't.

**Everything else** (seed, content, hidden gate, TrackLevelsNav unlock, LevelTable filter, tracks/ghost/[level] notFound for unqualified hidden access, seed script, point values) is already in place and passing tests.

**Out of scope:** container-side filesystem layout per spec section 7 (operations task, separate).

---

## Task 1: Add `ghost_graduate` to BadgeKind

**File:** `src/lib/badges/types.ts`

- Add `"ghost_graduate"` to the `BadgeKind` union.
- Add to `KINDS` set.
- Add to `BADGE_LABEL` with value `"Ghost Graduate"`.

## Task 2: Gold pill color for graduate badge

**File:** `src/components/badges/BadgePill.tsx`

- Extend `COLOR` record with `ghost_graduate: "border-yellow text-yellow"` — or use the existing amber/gold token if `text-yellow` is not in the Tailwind theme. Prefer `border-amber text-amber font-bold` if no dedicated gold token exists.

## Task 3: Award logic in `decideBadgesToAward`

**Files:** `src/lib/badges/award.ts`, `tests/unit/badges/award.test.ts`

Extend `decideBadgesToAward` with a new signal `isGhostGraduate: boolean` that the caller passes when the submission being processed is the level-22 flag on the ghost track AND the user doesn't already hold the badge. When true, the return array includes:

```ts
{ kind: "ghost_graduate", refId: <trackId> }
```

Unit tests:
- Returns `ghost_graduate` when `isGhostGraduate: true`.
- Omits it when false.
- First blood + track complete + graduate returned together.

## Task 4: Wire into submitFlag

**File:** `src/lib/tracks/submit.ts`

After `decideBadgesToAward` consumes `trackCompleted`, add the graduate check:

```ts
const isGhostGraduate =
  trackRow?.slug === "ghost" && level.idx === 22;
```

Pass into `decideBadgesToAward`. The idempotency check against existing badges already exists in the insert path (we query existing badges via Plan 04 logic) — reuse it or rely on a unique-partial-index or `ON CONFLICT DO NOTHING`. For simplicity: check existing badges for `kind='ghost_graduate' AND refId=trackId AND userId=<user>`; skip insert if present.

## Task 5: Level 21 hint

**File:** `src/lib/tracks/ghost-level-content.ts`

Append one sentence to the existing level-21 `goal` or create a new optional `afterClear` field rendered below the goal on the level page. Simpler: extend the goal string. Text:

> "Before you go — take one last look at this machine. Everything you ever learned is written on it somewhere. Not every door opens on the first knock."

Keep it minimal and non-spoilery.

## Task 6: E2E test

**File:** `tests/e2e/ghost-graduate.spec.ts`

Short spec:

1. Seed ghost with all 23 levels (seed script already does this).
2. Register a user via the UI.
3. Directly INSERT submissions for idx 0..21 via `postgres` SQL (skipping the UI flows — we're testing the graduation branch, not each level).
4. Visit `/tracks/ghost` → level 22 "CLASSIFIED" row visible in a separate unlocked section (or in the sidebar).
5. Visit `/tracks/ghost/22` → returns 200.
6. Look up the idx-22 flag from `levels` + `flags` tables via SQL → submit via `/submit`.
7. Expect the submission success and a row in `badges` where `kind='ghost_graduate'`.
8. Visit `/dashboard` → "Ghost Graduate" badge pill visible.

Before-all: truncate all tables, re-seed ghost.

## Task 7: Sanity + tag

- `npm test` — must be 75 + new unit tests, all green.
- `DATABASE_URL=... npm run test:e2e` — must be 23 + new e2e tests.
- Re-seed ghost (e2e truncates).
- Commit, merge to main, tag `v0.8.0-ghost-graduate`, push.
- Update Obsidian changelog.

## Notes

- Level 22 remains hidden on `/tracks/ghost` even after unlock — the unlocked view appears in the sidebar's `TrackLevelsNav` hidden section, and direct navigation to `/tracks/ghost/22` starts working. Spec section 6.1 is explicit about this — do not add the level to the public table.
- Graduation badge refId stores the ghost trackId, not the level id, so the badge is a one-per-track-per-user award.
- No new env vars, no new migrations, no schema changes.
