# BreachLab Platform — Plan 04: First Blood + Badges

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first-blood and badge systems on top of the tracks/submission plumbing already in place. First blood detection and bonus points are already computed in Plan 03 — this plan persists badges, surfaces them in the UI, powers the `/leaderboard/first-bloods` page, and adds a "FIRST BLOOD" banner on level pages until someone takes it. A second badge type — `track_complete` — is awarded automatically when a user solves every level in a track.

**Architecture:** One new Drizzle table `badges` (user_id, kind, ref_id, awarded_at). Badge creation happens inside `submitFlag` transaction as a side effect, right after the submission row is inserted. A tiny `awardBadges` helper keeps the logic testable and out of the submission hot path. The first-bloods page queries `badges` filtered by `kind = 'first_blood'`, joined to levels + users. The level table shows a "FIRST BLOOD" pill on any level that has no first blood yet OR the username of whoever took it. Track-complete detection runs at the end of each submission by counting the user's distinct solved levels vs the track's total.

**Tech Stack additions:** None.

**Out of scope:** Supporter badge (Plan 07, written on BTCPay webhook), speedrun_top10 badge (Plan 05). Badge icons are text pills for v1 — real SVG crests later.

---

## File Structure

```
breachlab-platform/
├── drizzle/0002_badges.sql                         -- generated
├── src/
│   ├── lib/
│   │   ├── db/schema.ts                            -- append `badges` table
│   │   └── badges/
│   │       ├── award.ts                            -- awardBadges(tx, userId, levelId, isFirstBlood)
│   │       ├── queries.ts                          -- getFirstBloods, getBadgesForUser
│   │       └── types.ts                            -- BadgeKind union + helpers
│   ├── app/
│   │   ├── leaderboard/first-bloods/page.tsx       -- REPLACE stub with real list
│   │   └── tracks/ghost/page.tsx                   -- show FIRST BLOOD pills
│   └── components/
│       ├── tracks/LevelTable.tsx                   -- accept firstBloodByLevelId
│       └── badges/BadgePill.tsx                    -- small label component
├── tests/
│   └── unit/
│       └── badges/
│           ├── award.test.ts                       -- in-memory coverage of award logic
│           └── queries.test.ts                     -- ...
```

---

## Task 1: Drizzle `badges` table + migration

**Files:**
- Modify: `src/lib/db/schema.ts`
- Create: `drizzle/0002_*.sql`

- [ ] **Step 1: Append `badges` table to `schema.ts`**

After the `submissions` table definition, before the `export type` block:

```ts
export const badges = pgTable("badges", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  refId: uuid("ref_id"),
  awardedAt: timestamp("awarded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Badge = typeof badges.$inferSelect;
```

Note: `ref_id` is nullable so a future badge kind (supporter) can skip it. For `first_blood` it's the `level_id`, for `track_complete` it's the `track_id`.

- [ ] **Step 2: Generate and apply migration**

```bash
docker compose up -d db
sleep 3
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run db:generate
docker compose exec -T db psql -U breachlab -d breachlab < drizzle/0002_*.sql
docker compose exec -T db psql -U breachlab -d breachlab -c "\dt"
```

Expected: `badges` table visible alongside the existing 8.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(badges): add badges table and migration"
```

---

## Task 2: Badge types (TDD)

**Files:**
- Create: `src/lib/badges/types.ts`
- Create: `tests/unit/badges/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { isBadgeKind, BADGE_LABEL } from "@/lib/badges/types";

describe("badge types", () => {
  it("recognizes known kinds", () => {
    expect(isBadgeKind("first_blood")).toBe(true);
    expect(isBadgeKind("track_complete")).toBe(true);
    expect(isBadgeKind("supporter")).toBe(true);
    expect(isBadgeKind("speedrun_top10")).toBe(true);
  });

  it("rejects unknown kinds", () => {
    expect(isBadgeKind("hacker_deluxe")).toBe(false);
    expect(isBadgeKind("")).toBe(false);
  });

  it("labels first_blood as 'First Blood'", () => {
    expect(BADGE_LABEL.first_blood).toBe("First Blood");
  });

  it("labels track_complete as 'Track Complete'", () => {
    expect(BADGE_LABEL.track_complete).toBe("Track Complete");
  });
});
```

- [ ] **Step 2: Implement**

```ts
export type BadgeKind =
  | "first_blood"
  | "track_complete"
  | "supporter"
  | "speedrun_top10";

const KINDS = new Set<BadgeKind>([
  "first_blood",
  "track_complete",
  "supporter",
  "speedrun_top10",
]);

export function isBadgeKind(value: string): value is BadgeKind {
  return KINDS.has(value as BadgeKind);
}

export const BADGE_LABEL: Record<BadgeKind, string> = {
  first_blood: "First Blood",
  track_complete: "Track Complete",
  supporter: "Supporter",
  speedrun_top10: "Speedrun Top 10",
};
```

- [ ] **Step 3: Run tests and commit**

```bash
npm test
git add -A
git commit -m "feat(badges): badge kind union + labels"
```

---

## Task 3: Award helper (TDD with real DB)

**Files:**
- Create: `src/lib/badges/award.ts`
- Create: `tests/unit/badges/award.test.ts`

The award logic touches the DB so the test spins up a throwaway transaction. Since vitest unit tests don't go through the docker compose stack, we instead test the *pure decision function* — given a set of inputs, decide which badges to award. The actual `INSERT` happens in a thin wrapper called from `submitFlag`.

- [ ] **Step 1: Write the failing test (pure decision logic)**

```ts
import { describe, it, expect } from "vitest";
import { decideBadgesToAward } from "@/lib/badges/award";

describe("decideBadgesToAward", () => {
  it("awards first_blood when isFirstBlood is true", () => {
    const badges = decideBadgesToAward({
      isFirstBlood: true,
      levelId: "lvl-1",
      trackId: "trk-1",
      trackCompleted: false,
    });
    expect(badges).toEqual([{ kind: "first_blood", refId: "lvl-1" }]);
  });

  it("awards track_complete when trackCompleted", () => {
    const badges = decideBadgesToAward({
      isFirstBlood: false,
      levelId: "lvl-9",
      trackId: "trk-1",
      trackCompleted: true,
    });
    expect(badges).toEqual([{ kind: "track_complete", refId: "trk-1" }]);
  });

  it("awards both when first blood AND track complete", () => {
    const badges = decideBadgesToAward({
      isFirstBlood: true,
      levelId: "lvl-9",
      trackId: "trk-1",
      trackCompleted: true,
    });
    expect(badges).toHaveLength(2);
    expect(badges).toContainEqual({ kind: "first_blood", refId: "lvl-9" });
    expect(badges).toContainEqual({ kind: "track_complete", refId: "trk-1" });
  });

  it("awards nothing when neither", () => {
    expect(
      decideBadgesToAward({
        isFirstBlood: false,
        levelId: "lvl-1",
        trackId: "trk-1",
        trackCompleted: false,
      })
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement**

Create `src/lib/badges/award.ts`:

```ts
import type { BadgeKind } from "./types";

export type AwardContext = {
  isFirstBlood: boolean;
  levelId: string;
  trackId: string;
  trackCompleted: boolean;
};

export type BadgeToAward = { kind: BadgeKind; refId: string };

export function decideBadgesToAward(ctx: AwardContext): BadgeToAward[] {
  const out: BadgeToAward[] = [];
  if (ctx.isFirstBlood) out.push({ kind: "first_blood", refId: ctx.levelId });
  if (ctx.trackCompleted)
    out.push({ kind: "track_complete", refId: ctx.trackId });
  return out;
}
```

- [ ] **Step 3: Run tests and commit**

```bash
npm test
git add -A
git commit -m "feat(badges): decideBadgesToAward decision function"
```

---

## Task 4: Wire badge insertion into submitFlag

**Files:**
- Modify: `src/lib/tracks/submit.ts`

- [ ] **Step 1: Extend the submit flow**

After the `await db.insert(submissions)...` line, add:

```ts
// Count distinct solved levels for this user in this track to decide
// track_complete. We just inserted a submission so the count includes it.
const [{ totalInTrack }] = await db
  .select({ totalInTrack: sql<number>`count(*)::int` })
  .from(levels)
  .where(eq(levels.trackId, level.trackId));

const solvedInTrack = await db
  .select({ levelId: submissions.levelId })
  .from(submissions)
  .innerJoin(levels, eq(levels.id, submissions.levelId))
  .where(
    and(eq(submissions.userId, userId), eq(levels.trackId, level.trackId))
  );
const trackCompleted =
  solvedInTrack.length >= Number(totalInTrack) && Number(totalInTrack) > 0;

const toAward = decideBadgesToAward({
  isFirstBlood,
  levelId: level.id,
  trackId: level.trackId,
  trackCompleted,
});
if (toAward.length > 0) {
  await db.insert(badges).values(
    toAward.map((b) => ({
      userId,
      kind: b.kind,
      refId: b.refId,
    }))
  );
}
```

Add the needed imports at the top of the file:

```ts
import { sql } from "drizzle-orm";
import { badges } from "@/lib/db/schema";
import { decideBadgesToAward } from "@/lib/badges/award";
```

- [ ] **Step 2: Verify build**

```bash
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(badges): award first_blood and track_complete inside submitFlag"
```

---

## Task 5: Badge queries

**Files:**
- Create: `src/lib/badges/queries.ts`

- [ ] **Step 1: Implement**

```ts
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { badges, users, levels, tracks } from "@/lib/db/schema";

export type FirstBloodRow = {
  levelId: string;
  levelIdx: number;
  levelTitle: string;
  trackSlug: string;
  trackName: string;
  username: string;
  awardedAt: Date;
};

export async function getFirstBloods(): Promise<FirstBloodRow[]> {
  const rows = await db
    .select({
      levelId: levels.id,
      levelIdx: levels.idx,
      levelTitle: levels.title,
      trackSlug: tracks.slug,
      trackName: tracks.name,
      username: users.username,
      awardedAt: badges.awardedAt,
    })
    .from(badges)
    .innerJoin(levels, eq(levels.id, badges.refId))
    .innerJoin(tracks, eq(tracks.id, levels.trackId))
    .innerJoin(users, eq(users.id, badges.userId))
    .where(eq(badges.kind, "first_blood"))
    .orderBy(desc(badges.awardedAt));
  return rows;
}

export async function getFirstBloodByLevel(): Promise<
  Map<string, { username: string; awardedAt: Date }>
> {
  const rows = await db
    .select({
      levelId: levels.id,
      username: users.username,
      awardedAt: badges.awardedAt,
    })
    .from(badges)
    .innerJoin(levels, eq(levels.id, badges.refId))
    .innerJoin(users, eq(users.id, badges.userId))
    .where(eq(badges.kind, "first_blood"));
  const map = new Map<string, { username: string; awardedAt: Date }>();
  for (const r of rows) {
    map.set(r.levelId, { username: r.username, awardedAt: r.awardedAt });
  }
  return map;
}

export async function getBadgesForUser(userId: string) {
  return db
    .select()
    .from(badges)
    .where(eq(badges.userId, userId))
    .orderBy(desc(badges.awardedAt));
}
```

- [ ] **Step 2: Commit**

```bash
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run build
git add -A
git commit -m "feat(badges): badge queries (first bloods, per-user)"
```

---

## Task 6: BadgePill component

**Files:**
- Create: `src/components/badges/BadgePill.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { BadgeKind } from "@/lib/badges/types";
import { BADGE_LABEL } from "@/lib/badges/types";

const COLOR: Record<BadgeKind, string> = {
  first_blood: "border-red text-red",
  track_complete: "border-amber text-amber",
  supporter: "border-green text-green",
  speedrun_top10: "border-amber text-amber",
};

export function BadgePill({ kind }: { kind: BadgeKind }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs uppercase tracking-wider border ${COLOR[kind]}`}
    >
      {BADGE_LABEL[kind]}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(badges): BadgePill component"
```

---

## Task 7: `/leaderboard/first-bloods` page (real data)

**Files:**
- Modify: `src/app/leaderboard/first-bloods/page.tsx`

- [ ] **Step 1: Replace stub**

```tsx
import { getFirstBloods } from "@/lib/badges/queries";
import { BadgePill } from "@/components/badges/BadgePill";

export default async function FirstBloodsPage() {
  const rows = await getFirstBloods();
  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">First Bloods</h1>
      <nav className="flex gap-4 text-sm border-b border-border pb-2">
        <a href="/leaderboard" className="text-muted">
          Global
        </a>
        <a href="/leaderboard/speedrun" className="text-muted">
          Speedrun
        </a>
        <span className="text-amber">First Bloods</span>
      </nav>
      {rows.length === 0 ? (
        <p className="text-muted text-sm">
          No first bloods yet. Every level on the board is up for grabs.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left py-1">Track</th>
              <th className="text-left py-1">Level</th>
              <th className="text-left py-1">Operative</th>
              <th className="text-left py-1">Badge</th>
              <th className="text-right py-1">Taken</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.levelId} className="border-b border-border/50">
                <td className="py-1 text-muted">{r.trackName}</td>
                <td className="py-1">
                  L{r.levelIdx} — {r.levelTitle}
                </td>
                <td className="py-1">
                  <span className="text-amber">@{r.username}</span>
                </td>
                <td className="py-1">
                  <BadgePill kind="first_blood" />
                </td>
                <td className="py-1 text-right text-muted">
                  {new Date(r.awardedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run build
git add -A
git commit -m "feat(badges): /leaderboard/first-bloods page with real data"
```

---

## Task 8: Ghost track page shows first-blood state

**Files:**
- Modify: `src/app/tracks/ghost/page.tsx`
- Modify: `src/components/tracks/LevelTable.tsx`

- [ ] **Step 1: Extend `LevelTable` to accept first-blood info**

```tsx
import type { Level } from "@/lib/db/schema";

export type FirstBloodInfo = { username: string; awardedAt: Date };

export function LevelTable({
  levels,
  solvedLevelIds,
  firstBloodByLevelId,
}: {
  levels: Level[];
  solvedLevelIds: Set<string>;
  firstBloodByLevelId: Map<string, FirstBloodInfo>;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted border-b border-border">
          <th className="text-left py-1">#</th>
          <th className="text-left py-1">Level</th>
          <th className="text-right py-1">Points</th>
          <th className="text-left py-1 pl-4">First Blood</th>
          <th className="text-right py-1">Status</th>
        </tr>
      </thead>
      <tbody>
        {levels.map((l) => {
          const solved = solvedLevelIds.has(l.id);
          const fb = firstBloodByLevelId.get(l.id);
          return (
            <tr key={l.id} className="border-b border-border/50">
              <td className="py-1 text-muted">{l.idx}</td>
              <td className="py-1">{l.title}</td>
              <td className="py-1 text-right">{l.pointsBase}</td>
              <td className="py-1 pl-4">
                {fb ? (
                  <span className="text-amber">@{fb.username}</span>
                ) : (
                  <span className="text-red text-xs">FIRST BLOOD AVAILABLE</span>
                )}
              </td>
              <td
                className={`py-1 text-right ${
                  solved ? "text-green" : "text-muted"
                }`}
              >
                {solved ? "solved" : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Update `src/app/tracks/ghost/page.tsx`**

```tsx
import { eq } from "drizzle-orm";
import { getTrackBySlug, getLevelsForTrack } from "@/lib/tracks/queries";
import { LevelTable } from "@/components/tracks/LevelTable";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";
import { getFirstBloodByLevel } from "@/lib/badges/queries";

export default async function GhostTrackPage() {
  const track = await getTrackBySlug("ghost");
  if (!track) {
    return (
      <div className="space-y-4">
        <h1 className="text-amber text-xl">Ghost</h1>
        <p className="text-red">
          Track not seeded. Run <code>npm run seed:ghost</code>.
        </p>
      </div>
    );
  }
  const levelRows = await getLevelsForTrack(track.id);
  const firstBloodByLevelId = await getFirstBloodByLevel();
  const { user } = await getCurrentSession();

  let solvedLevelIds = new Set<string>();
  if (user && levelRows.length > 0) {
    const userRows = await db
      .select({ levelId: submissions.levelId })
      .from(submissions)
      .where(eq(submissions.userId, user.id));
    solvedLevelIds = new Set(userRows.map((r) => r.levelId));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">Ghost</h1>
      <p className="text-sm">{track.description}</p>
      <pre className="bg-border/40 p-3 text-sm">
        ssh ghost0@ghost.breachlab.org -p 2222
      </pre>
      <LevelTable
        levels={levelRows}
        solvedLevelIds={solvedLevelIds}
        firstBloodByLevelId={firstBloodByLevelId}
      />
      {user ? (
        <p className="text-xs">
          <a href="/submit">Submit a flag →</a>
        </p>
      ) : (
        <p className="text-xs text-muted">
          <a href="/login">Log in</a> to submit flags and track progress.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run build
git add -A
git commit -m "feat(badges): Ghost track page shows first-blood state per level"
```

---

## Task 9: Dashboard shows badges

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Read the user's badges and render pills**

```tsx
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getBadgesForUser } from "@/lib/badges/queries";
import { BadgePill } from "@/components/badges/BadgePill";
import { isBadgeKind } from "@/lib/badges/types";

export default async function DashboardPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  const badges = await getBadgesForUser(user.id);
  return (
    <div className="space-y-6">
      <h1 className="text-amber text-xl">Operative dashboard</h1>
      <p className="text-sm">
        Welcome, <span className="text-amber">{user.username}</span>.
      </p>
      {!user.emailVerified && (
        <p className="text-red text-xs">
          Email not verified. Check your inbox for the verification link.
        </p>
      )}
      <section>
        <h2 className="text-lg mb-2">Badges</h2>
        {badges.length === 0 ? (
          <p className="text-muted text-xs">
            Take a first blood or complete a track to earn your first badge.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {badges.map((b) =>
              isBadgeKind(b.kind) ? (
                <li key={b.id}>
                  <BadgePill kind={b.kind} />
                </li>
              ) : null
            )}
          </ul>
        )}
      </section>
      <ul className="text-sm space-y-2">
        <li>
          <a href="/dashboard/account">Account settings</a>
        </li>
        <li>
          <a href="/dashboard/2fa">
            Two-factor authentication{" "}
            <span className={user.totpEnabled ? "text-green" : "text-muted"}>
              ({user.totpEnabled ? "enabled" : "disabled"})
            </span>
          </a>
        </li>
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run build
git add -A
git commit -m "feat(badges): show user badges on dashboard"
```

---

## Task 10: End-to-end spec — first blood + track complete

**Files:**
- Modify: `tests/e2e/tracks.spec.ts` (add to existing describe) OR create `tests/e2e/badges.spec.ts`

Create a new spec file for clarity.

- [ ] **Step 1: Create `tests/e2e/badges.spec.ts`**

```ts
import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createHash } from "node:crypto";

const DB_URL =
  process.env.DATABASE_URL ??
  "postgres://breachlab:breachlab@127.0.0.1:5432/breachlab";

const sql = postgres(DB_URL);

function sha256Hex(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

const FLAG_A = "FLAG{ghost_l0_badges_a}";
const FLAG_B = "FLAG{ghost_l1_badges_b}";

test.describe("badges", () => {
  test.beforeAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, badges, flags, levels, tracks CASCADE`;
    const [track] = await sql`
      INSERT INTO tracks (slug, name, description, status, order_idx)
      VALUES ('ghost', 'Ghost', 'e2e', 'live', 0)
      RETURNING id
    `;
    const [lvl0] = await sql`
      INSERT INTO levels (track_id, idx, title, points_base, points_first_blood_bonus)
      VALUES (${track.id}, 0, 'First Contact', 100, 50)
      RETURNING id
    `;
    const [lvl1] = await sql`
      INSERT INTO levels (track_id, idx, title, points_base, points_first_blood_bonus)
      VALUES (${track.id}, 1, 'Name Game', 120, 50)
      RETURNING id
    `;
    await sql`INSERT INTO flags (level_id, flag_hash) VALUES (${lvl0.id}, ${sha256Hex(FLAG_A)})`;
    await sql`INSERT INTO flags (level_id, flag_hash) VALUES (${lvl1.id}, ${sha256Hex(FLAG_B)})`;
  });

  test.afterAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, badges, flags, levels, tracks CASCADE`;
    await sql.end();
  });

  test("first blood writes badge and appears on first bloods page", async ({
    page,
  }) => {
    const username = `fb_op_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    await page.goto("/submit");
    await page.fill('input[name="flag"]', FLAG_A);
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Captured ghost level 0/)).toBeVisible();

    // DB assert — badge row exists
    const [row] = await sql<{ kind: string }[]>`
      SELECT kind FROM badges b
      JOIN users u ON u.id = b.user_id
      WHERE u.username = ${username} AND b.kind = 'first_blood'
    `;
    expect(row?.kind).toBe("first_blood");

    // UI — visit first bloods page
    await page.goto("/leaderboard/first-bloods");
    await expect(page.getByText(`@${username}`)).toBeVisible();
    await expect(page.getByText("First Blood").first()).toBeVisible();
  });

  test("track complete awards track_complete when all levels solved", async ({
    page,
  }) => {
    const username = `tc_op_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    await page.goto("/submit");
    await page.fill('input[name="flag"]', FLAG_A);
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Captured/)).toBeVisible();

    await page.goto("/submit");
    await page.fill('input[name="flag"]', FLAG_B);
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Captured/)).toBeVisible();

    const [row] = await sql<{ kind: string }[]>`
      SELECT kind FROM badges b
      JOIN users u ON u.id = b.user_id
      WHERE u.username = ${username} AND b.kind = 'track_complete'
    `;
    expect(row?.kind).toBe("track_complete");

    // Dashboard shows the badge
    await page.goto("/dashboard");
    await expect(page.getByText("Track Complete")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
docker compose up -d db
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run test:e2e
```

Expected: previous 12 tests plus 2 new badges tests, all green.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(badges): e2e for first blood + track complete"
```

---

## Task 11: Final sanity + tag

- [ ] **Step 1: Run everything**

```bash
npm test && DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run test:e2e
```

- [ ] **Step 2: Tag and push**

```bash
git tag -a v0.4.0-badges -m "BreachLab Platform: first blood + track complete badges"
git push
git push --tags
```

- [ ] **Step 3: Update Obsidian Changelog** with Plan 04 shipped entry.

---

## Spec Coverage Check

- §5 Data model — `badges` table → Task 1
- §6.3 First blood bonus → already in Plan 03, badge persistence → Task 4
- §7 UI badges (dashboard, first bloods page, level pill) → Tasks 6–9
- §9 v1 — first blood + badges delivered

## Notes for Engineer

- The badge side-effects inside `submitFlag` are **not wrapped in a DB transaction** for v1. If the `badges` insert fails after the `submissions` insert succeeds, we get a submission without its badge. Acceptable for v1 — Plan 05 or 06 can add a proper transaction boundary if a real failure mode shows up.
- `supporter` and `speedrun_top10` are included in the `BadgeKind` union so they don't require a schema change when Plans 05/07 need them.
- First-blood is per-level, track-complete is per-track. No other badges in v1.
