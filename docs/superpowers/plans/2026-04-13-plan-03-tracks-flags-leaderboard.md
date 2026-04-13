# BreachLab Platform — Plan 03: Tracks, Flags, Leaderboard, Live Ticker

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring BreachLab to life — tracks, levels, flag submission, global points leaderboard, top-5 sidebar widget with real data, and a Server-Sent Events live ticker of recent completions. After this plan a logged-in operative can view the Ghost track, submit flags, earn points, and appear on the leaderboard — and every other operative on the site sees their completion slide into the sidebar ticker in real time.

**Architecture:** Four new Drizzle tables (`tracks`, `levels`, `flags`, `submissions`). Flags are stored as sha256 hashes only, plaintext exists only in a seed script. Submission is a Server Action that validates the logged-in user, hashes the input flag, looks it up, and writes a `submission` row with computed points. The global leaderboard is a SQL aggregate `SUM(points_awarded) GROUP BY user_id`. The Top-5 sidebar widget reuses the same query limited to 5. The recent ops ticker is a Next.js App Router route handler streaming SSE — on submit, a simple in-process `EventTarget` dispatches, the route handler subscribes per connection. Good enough for v1; Redis pub/sub lands when we have multiple web replicas.

**Tech Stack additions:** None runtime — stays on Drizzle + Postgres + React. One dev dependency: none. We add a single seed script `scripts/seed-ghost.ts` runnable with `tsx`.

**Out of scope:** First blood badges (Plan 04), speedrun leaderboard + anti-cheat (Plan 05), public profiles (Plan 06), BTCPay donations (Plan 07). This plan delivers only the core `Global` leaderboard tab. Speedrun + First Blood tabs are stub links leading to "coming soon" pages.

---

## File Structure

New and modified files after this plan:

```
breachlab-platform/
├── drizzle/
│   └── 0001_tracks_levels_flags_submissions.sql   -- generated migration
├── scripts/
│   └── seed-ghost.ts                              -- run with `npx tsx scripts/seed-ghost.ts`
├── src/
│   ├── lib/
│   │   ├── db/schema.ts                           -- append 4 tables
│   │   ├── tracks/
│   │   │   ├── queries.ts                         -- getTrackBySlug, getLevelsForTrack
│   │   │   ├── submit.ts                          -- submitFlag core logic
│   │   │   └── points.ts                          -- pointsForLevel helpers
│   │   ├── leaderboard/
│   │   │   └── queries.ts                         -- getGlobalTop(n), getUserRank
│   │   └── live/
│   │       ├── bus.ts                             -- in-process EventTarget bus
│   │       └── events.ts                          -- LiveEvent type + payload helpers
│   │   └── validation/
│   │       └── flags.ts                           -- zod: flag shape
│   ├── app/
│   │   ├── tracks/
│   │   │   └── ghost/page.tsx                     -- REPLACE: real level table
│   │   ├── submit/
│   │   │   ├── page.tsx                           -- NEW: logged-in flag submit page
│   │   │   └── actions.ts                         -- NEW: submitFlagAction
│   │   ├── leaderboard/
│   │   │   ├── page.tsx                           -- REPLACE: tabs + Global table
│   │   │   └── (tabs)/
│   │   │       ├── speedrun/page.tsx              -- coming soon
│   │   │       └── first-bloods/page.tsx          -- coming soon
│   │   └── api/
│   │       └── live/events/route.ts               -- NEW: SSE endpoint
│   └── components/
│       ├── tracks/LevelTable.tsx                  -- NEW
│       ├── submit/SubmitForm.tsx                  -- NEW
│       ├── leaderboard/LeaderboardTable.tsx       -- NEW
│       ├── LiveOpsWidget.tsx                      -- REPLACE: real counts
│       ├── TopFiveWidget.tsx                      -- REPLACE: real query
│       └── RecentTickerWidget.tsx                 -- REPLACE: client, SSE subscriber
└── tests/
    ├── unit/
    │   ├── tracks/
    │   │   ├── points.test.ts
    │   │   └── submit.test.ts                     -- in-memory DB or mocks
    │   ├── leaderboard/
    │   │   └── queries.test.ts
    │   └── live/
    │       └── bus.test.ts
    └── e2e/
        └── tracks.spec.ts                         -- register → submit → see leaderboard → see ticker
```

Notes:
- The ticker widget becomes a **client component**. Its current placeholder already renders in unit tests via RTL; the new version accepts an initial server-rendered snapshot plus subscribes to `/api/live/events`.
- The sidebar stays a server component. Because the ticker is now a client child, React handles the boundary automatically.

---

## Task 1: Schema additions + migration

**Files:**
- Modify: `src/lib/db/schema.ts` (append, don't replace existing auth tables)
- Create: `drizzle/0001_*.sql`

- [ ] **Step 1: Append to `src/lib/db/schema.ts`**

Add after the existing auth tables, before the `export type User = ...` line:

```ts
import { integer } from "drizzle-orm/pg-core";

export const tracks = pgTable("tracks", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("planned"), // live | soon | planned
  orderIdx: integer("order_idx").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const levels = pgTable("levels", {
  id: uuid("id").defaultRandom().primaryKey(),
  trackId: uuid("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  idx: integer("idx").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  pointsBase: integer("points_base").notNull().default(100),
  pointsFirstBloodBonus: integer("points_first_blood_bonus").notNull().default(50),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const flags = pgTable("flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  levelId: uuid("level_id")
    .notNull()
    .references(() => levels.id, { onDelete: "cascade" }),
  flagHash: text("flag_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  levelId: uuid("level_id")
    .notNull()
    .references(() => levels.id, { onDelete: "cascade" }),
  pointsAwarded: integer("points_awarded").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  sourceIp: text("source_ip"),
});

export type Track = typeof tracks.$inferSelect;
export type Level = typeof levels.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
```

Keep the previous `integer` import from `drizzle-orm/pg-core` at the top — if it was not yet imported, add it to the existing import statement, don't duplicate.

- [ ] **Step 2: Generate the migration**

```bash
cd ~/Desktop/breachlab-platform
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run db:generate
```

Expected: a new file `drizzle/0001_*.sql` created. Inspect to confirm it contains `CREATE TABLE tracks`, `levels`, `flags`, `submissions`.

- [ ] **Step 3: Apply the migration**

```bash
docker compose up -d db
sleep 3
docker compose exec -T db psql -U breachlab -d breachlab < drizzle/0001_*.sql
docker compose exec -T db psql -U breachlab -d breachlab -c "\dt"
```

Expected: 8 tables total (4 auth + 4 new).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(tracks): add tracks/levels/flags/submissions schema and migration"
```

---

## Task 2: Points calculation helpers (TDD)

**Files:**
- Create: `src/lib/tracks/points.ts`
- Create: `tests/unit/tracks/points.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/tracks/points.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeAwardedPoints } from "@/lib/tracks/points";

describe("computeAwardedPoints", () => {
  it("returns base when not first blood", () => {
    expect(
      computeAwardedPoints({ pointsBase: 100, pointsFirstBloodBonus: 50 }, false)
    ).toBe(100);
  });

  it("adds first blood bonus when first blood", () => {
    expect(
      computeAwardedPoints({ pointsBase: 100, pointsFirstBloodBonus: 50 }, true)
    ).toBe(150);
  });

  it("clamps negative base to zero", () => {
    expect(
      computeAwardedPoints({ pointsBase: -10, pointsFirstBloodBonus: 50 }, false)
    ).toBe(0);
  });
});
```

- [ ] **Step 2: Run, verify failure**

```bash
npm test
```

- [ ] **Step 3: Implement**

Create `src/lib/tracks/points.ts`:

```ts
export type LevelPoints = {
  pointsBase: number;
  pointsFirstBloodBonus: number;
};

export function computeAwardedPoints(
  level: LevelPoints,
  isFirstBlood: boolean
): number {
  const base = Math.max(0, level.pointsBase);
  if (!isFirstBlood) return base;
  const bonus = Math.max(0, level.pointsFirstBloodBonus);
  return base + bonus;
}
```

- [ ] **Step 4: Run, verify pass**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(tracks): points helper with first-blood bonus"
```

---

## Task 3: Flag shape validation (TDD)

**Files:**
- Create: `src/lib/validation/flags.ts`
- Create: `tests/unit/tracks/flag-validation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { flagSchema, normalizeFlag } from "@/lib/validation/flags";

describe("flag validation", () => {
  it("accepts canonical FLAG{...} form", () => {
    expect(flagSchema.safeParse("FLAG{ghost_l0_abc123}").success).toBe(true);
  });

  it("accepts lowercase flag{...}", () => {
    expect(flagSchema.safeParse("flag{ghost_l0_abc123}").success).toBe(true);
  });

  it("rejects non-FLAG input", () => {
    expect(flagSchema.safeParse("hunter2").success).toBe(false);
  });

  it("rejects empty", () => {
    expect(flagSchema.safeParse("").success).toBe(false);
  });

  it("rejects > 128 chars", () => {
    expect(flagSchema.safeParse("FLAG{" + "a".repeat(200) + "}").success).toBe(false);
  });

  it("normalizeFlag uppercases prefix and trims whitespace", () => {
    expect(normalizeFlag("  flag{abc}  ")).toBe("FLAG{abc}");
  });
});
```

- [ ] **Step 2: Run, verify failure**

- [ ] **Step 3: Implement**

Create `src/lib/validation/flags.ts`:

```ts
import { z } from "zod";

export const flagSchema = z
  .string()
  .min(6)
  .max(128)
  .regex(/^FLAG\{[A-Za-z0-9_.\-]+\}$/i, "Invalid flag format");

export function normalizeFlag(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("flag{")) return trimmed;
  return "FLAG{" + trimmed.slice(5);
}
```

- [ ] **Step 4: Run, verify pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(tracks): flag shape validation and normalizer"
```

---

## Task 4: In-process live bus (TDD)

**Files:**
- Create: `src/lib/live/bus.ts`
- Create: `src/lib/live/events.ts`
- Create: `tests/unit/live/bus.test.ts`

Goal: a single-process EventTarget-style emitter for submission events. Plan 04+ can add Redis pub/sub; this is the v1 minimum to power the sidebar ticker.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { liveBus } from "@/lib/live/bus";
import type { LiveEvent } from "@/lib/live/events";

describe("liveBus", () => {
  it("delivers events to subscribers", async () => {
    const received: LiveEvent[] = [];
    const unsubscribe = liveBus.subscribe((e) => received.push(e));
    liveBus.publish({
      type: "submission",
      at: new Date().toISOString(),
      username: "ghost_op",
      trackSlug: "ghost",
      levelIdx: 3,
      levelTitle: "Signal in the Noise",
    });
    await Promise.resolve();
    expect(received.length).toBe(1);
    expect(received[0].username).toBe("ghost_op");
    unsubscribe();
  });

  it("does not deliver after unsubscribe", () => {
    let count = 0;
    const unsubscribe = liveBus.subscribe(() => count++);
    unsubscribe();
    liveBus.publish({
      type: "submission",
      at: new Date().toISOString(),
      username: "x",
      trackSlug: "ghost",
      levelIdx: 0,
      levelTitle: "x",
    });
    expect(count).toBe(0);
  });
});
```

- [ ] **Step 2: Run, verify failure**

- [ ] **Step 3: Implement**

Create `src/lib/live/events.ts`:

```ts
export type SubmissionEvent = {
  type: "submission";
  at: string;
  username: string;
  trackSlug: string;
  levelIdx: number;
  levelTitle: string;
};

export type LiveEvent = SubmissionEvent;
```

Create `src/lib/live/bus.ts`:

```ts
import type { LiveEvent } from "./events";

type Listener = (event: LiveEvent) => void;

class LiveBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(event: LiveEvent): void {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch {
        // swallow listener errors
      }
    }
  }
}

const globalKey = "__breachlab_live_bus__";
const g = globalThis as unknown as { [k: string]: LiveBus | undefined };
export const liveBus: LiveBus = g[globalKey] ?? (g[globalKey] = new LiveBus());
```

The `globalThis` trick keeps a single instance across Next.js hot reloads in dev.

- [ ] **Step 4: Run, verify pass**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(live): in-process live event bus with tests"
```

---

## Task 5: Tracks queries

**Files:**
- Create: `src/lib/tracks/queries.ts`

- [ ] **Step 1: Implement**

```ts
import { eq, asc, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tracks, levels } from "@/lib/db/schema";

export async function getTrackBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(tracks)
    .where(eq(tracks.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function getLevelsForTrack(trackId: string) {
  return db
    .select()
    .from(levels)
    .where(eq(levels.trackId, trackId))
    .orderBy(asc(levels.idx));
}

export async function getLevelByTrackAndIdx(trackId: string, idx: number) {
  const [row] = await db
    .select()
    .from(levels)
    .where(and(eq(levels.trackId, trackId), eq(levels.idx, idx)))
    .limit(1);
  return row ?? null;
}
```

- [ ] **Step 2: Verify build**

```bash
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(tracks): track and level queries"
```

---

## Task 6: submitFlag core logic

**Files:**
- Create: `src/lib/tracks/submit.ts`

This is the server-side function called by the Server Action. It takes a userId, raw flag string, resolves it against `flags.flag_hash`, checks the user hasn't already solved that level, computes points, writes a `submissions` row, publishes a `live` event, and returns a result.

- [ ] **Step 1: Implement**

```ts
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { flags, levels, submissions, tracks, users } from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { computeAwardedPoints } from "./points";
import { normalizeFlag, flagSchema } from "@/lib/validation/flags";
import { liveBus } from "@/lib/live/bus";

export type SubmitResult =
  | { ok: true; levelIdx: number; trackSlug: string; points: number }
  | { ok: false; error: string };

export async function submitFlag(
  userId: string,
  rawFlag: string,
  sourceIp: string | null
): Promise<SubmitResult> {
  const normalized = normalizeFlag(rawFlag);
  if (!flagSchema.safeParse(normalized).success) {
    return { ok: false, error: "Invalid flag format" };
  }

  const flagHash = await hashToken(normalized);
  const [flagRow] = await db
    .select()
    .from(flags)
    .where(eq(flags.flagHash, flagHash))
    .limit(1);
  if (!flagRow) return { ok: false, error: "Unknown flag" };

  const [level] = await db
    .select()
    .from(levels)
    .where(eq(levels.id, flagRow.levelId))
    .limit(1);
  if (!level) return { ok: false, error: "Unknown flag" };

  // Idempotent: a level can only be solved once per user
  const existing = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(eq(submissions.userId, userId), eq(submissions.levelId, level.id))
    )
    .limit(1);
  if (existing.length > 0) {
    return { ok: false, error: "Already solved" };
  }

  // is-first-blood: no submission for this level by anyone yet (excluding us)
  const anyPrior = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(eq(submissions.levelId, level.id))
    .limit(1);
  const isFirstBlood = anyPrior.length === 0;

  const points = computeAwardedPoints(level, isFirstBlood);
  await db.insert(submissions).values({
    userId,
    levelId: level.id,
    pointsAwarded: points,
    sourceIp: sourceIp ?? undefined,
  });

  // Look up track slug and username for the live event
  const [trackRow] = await db
    .select({ slug: tracks.slug })
    .from(tracks)
    .where(eq(tracks.id, level.trackId))
    .limit(1);
  const [userRow] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  liveBus.publish({
    type: "submission",
    at: new Date().toISOString(),
    username: userRow?.username ?? "unknown",
    trackSlug: trackRow?.slug ?? "unknown",
    levelIdx: level.idx,
    levelTitle: level.title,
  });

  return {
    ok: true,
    levelIdx: level.idx,
    trackSlug: trackRow?.slug ?? "",
    points,
  };
}
```

Note: first-blood bonus is implemented here but **badge creation lands in Plan 04**. For now the bonus points go in but no badge row is written yet.

- [ ] **Step 2: Verify build**

```bash
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run build
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(tracks): submitFlag core logic + live event publish"
```

---

## Task 7: Leaderboard queries

**Files:**
- Create: `src/lib/leaderboard/queries.ts`

- [ ] **Step 1: Implement**

```ts
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { submissions, users } from "@/lib/db/schema";

export type LeaderRow = {
  userId: string;
  username: string;
  points: number;
  solved: number;
};

export async function getGlobalTop(limit: number): Promise<LeaderRow[]> {
  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      points: sql<number>`coalesce(sum(${submissions.pointsAwarded}), 0)::int`,
      solved: sql<number>`count(${submissions.id})::int`,
    })
    .from(users)
    .leftJoin(submissions, eq(submissions.userId, users.id))
    .groupBy(users.id, users.username)
    .having(sql`count(${submissions.id}) > 0`)
    .orderBy(desc(sql`sum(${submissions.pointsAwarded})`))
    .limit(limit);
  return rows.map((r) => ({
    userId: r.userId,
    username: r.username,
    points: Number(r.points),
    solved: Number(r.solved),
  }));
}

export async function getLiveStats(): Promise<{
  operatives: number;
  completionsToday: number;
}> {
  const [usersCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(users);
  const [todayCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(submissions)
    .where(sql`${submissions.submittedAt} >= now() - interval '24 hours'`);
  return {
    operatives: Number(usersCount?.c ?? 0),
    completionsToday: Number(todayCount?.c ?? 0),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(leaderboard): global top query and live stats"
```

---

## Task 8: Seed script for Ghost track

**Files:**
- Create: `scripts/seed-ghost.ts`
- Modify: `package.json` scripts

Seeds the 9 Ghost levels with placeholder flags. Real BreachLab flag values come from the Ghost level filesystem — for v1 we use synthetic `FLAG{ghost_lN_<random>}` values and write them to a file next to the seed so they can be copied into the running Ghost containers later.

- [ ] **Step 1: Install `tsx`**

```bash
npm install -D tsx
```

- [ ] **Step 2: Create `scripts/seed-ghost.ts`**

```ts
import { db } from "../src/lib/db/client";
import { tracks, levels, flags } from "../src/lib/db/schema";
import { hashToken } from "../src/lib/auth/tokens";
import { eq } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const GHOST_LEVELS = [
  { idx: 0, title: "First Contact" },
  { idx: 1, title: "Name Game" },
  { idx: 2, title: "In The Shadows" },
  { idx: 3, title: "Access Denied" },
  { idx: 4, title: "Signal in the Noise" },
  { idx: 5, title: "The Listener" },
  { idx: 6, title: "Ghost in the Machine" },
  { idx: 7, title: "Lost in Translation" },
  { idx: 8, title: "Something's Running" },
];

async function main() {
  const existing = await db.select().from(tracks).where(eq(tracks.slug, "ghost"));
  let trackId: string;
  if (existing.length > 0) {
    trackId = existing[0].id;
    console.log(`Ghost track already exists: ${trackId}`);
  } else {
    const [row] = await db
      .insert(tracks)
      .values({
        slug: "ghost",
        name: "Ghost",
        description:
          "Linux and shell fundamentals. The first BreachLab track.",
        status: "live",
        orderIdx: 0,
      })
      .returning({ id: tracks.id });
    trackId = row.id;
    console.log(`Created Ghost track: ${trackId}`);
  }

  const plaintextFlags: Record<string, string> = {};
  for (const l of GHOST_LEVELS) {
    const [lvl] = await db
      .insert(levels)
      .values({
        trackId,
        idx: l.idx,
        title: l.title,
        pointsBase: 100 + l.idx * 20,
        pointsFirstBloodBonus: 50,
      })
      .onConflictDoNothing()
      .returning({ id: levels.id });
    if (!lvl) {
      console.log(`level ${l.idx} already exists, skipping flag`);
      continue;
    }
    const rand = crypto.randomBytes(8).toString("hex");
    const flagValue = `FLAG{ghost_l${l.idx}_${rand}}`;
    const hash = await hashToken(flagValue);
    await db.insert(flags).values({ levelId: lvl.id, flagHash: hash });
    plaintextFlags[`ghost_l${l.idx}`] = flagValue;
    console.log(`seeded level ${l.idx}: ${flagValue}`);
  }

  const outPath = path.resolve(".seed-flags.ghost.local.txt");
  const existingContent = await fs
    .readFile(outPath, "utf8")
    .catch(() => "");
  const merged =
    existingContent +
    "\n" +
    new Date().toISOString() +
    "\n" +
    Object.entries(plaintextFlags)
      .map(([k, v]) => `${k} = ${v}`)
      .join("\n") +
    "\n";
  await fs.writeFile(outPath, merged.trim() + "\n", "utf8");
  console.log(`wrote plaintext flags to ${outPath}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Add script entry to `package.json`**

In `scripts`:

```json
"seed:ghost": "tsx scripts/seed-ghost.ts"
```

- [ ] **Step 4: Add `.seed-flags.ghost.local.txt` to `.gitignore`**

Append:

```
.seed-flags.ghost.local.txt
```

- [ ] **Step 5: Run the seed**

```bash
docker compose up -d db
sleep 3
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run seed:ghost
cat .seed-flags.ghost.local.txt
```

Expected: 9 levels seeded, plaintext flags written to a local file (gitignored).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(tracks): seed script for Ghost track with 9 levels"
```

---

## Task 9: Tracks Ghost page (real level list)

**Files:**
- Modify: `src/app/tracks/ghost/page.tsx`
- Create: `src/components/tracks/LevelTable.tsx`

- [ ] **Step 1: Create `LevelTable` component**

```tsx
import type { Level } from "@/lib/db/schema";

export function LevelTable({
  levels,
  solvedLevelIds,
}: {
  levels: Level[];
  solvedLevelIds: Set<string>;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted border-b border-border">
          <th className="text-left py-1">#</th>
          <th className="text-left py-1">Level</th>
          <th className="text-right py-1">Points</th>
          <th className="text-right py-1">Status</th>
        </tr>
      </thead>
      <tbody>
        {levels.map((l) => {
          const solved = solvedLevelIds.has(l.id);
          return (
            <tr key={l.id} className="border-b border-border/50">
              <td className="py-1 text-muted">{l.idx}</td>
              <td className="py-1">{l.title}</td>
              <td className="py-1 text-right">{l.pointsBase}</td>
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

- [ ] **Step 2: Replace `src/app/tracks/ghost/page.tsx`**

```tsx
import { eq, inArray } from "drizzle-orm";
import { getTrackBySlug, getLevelsForTrack } from "@/lib/tracks/queries";
import { LevelTable } from "@/components/tracks/LevelTable";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";

export default async function GhostTrackPage() {
  const track = await getTrackBySlug("ghost");
  if (!track) {
    return (
      <div className="space-y-4">
        <h1 className="text-amber text-xl">Ghost</h1>
        <p className="text-red">Track not seeded. Run `npm run seed:ghost`.</p>
      </div>
    );
  }
  const levels = await getLevelsForTrack(track.id);
  const { user } = await getCurrentSession();

  let solvedLevelIds = new Set<string>();
  if (user && levels.length > 0) {
    const rows = await db
      .select({ levelId: submissions.levelId })
      .from(submissions)
      .where(
        inArray(
          submissions.levelId,
          levels.map((l) => l.id)
        )
      );
    solvedLevelIds = new Set(
      rows
        .filter(() => true) // placeholder: Drizzle doesn't support userId filter inline here cleanly
        .map((r) => r.levelId)
    );
    // Re-query scoped to user for accuracy:
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
      <LevelTable levels={levels} solvedLevelIds={solvedLevelIds} />
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

Note: the first query block is redundant but harmless; keeping only the `userRows` branch is cleaner. The plan's executor should simplify to only the `userRows` query before committing.

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(tracks): Ghost track page with level table and solved state"
```

---

## Task 10: Submit page + server action

**Files:**
- Create: `src/app/submit/page.tsx`
- Create: `src/app/submit/actions.ts`
- Create: `src/components/submit/SubmitForm.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { SubmitForm } from "@/components/submit/SubmitForm";

export default async function SubmitPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-amber text-xl">Submit flag</h1>
      <p className="text-sm text-muted">
        Paste a flag you found in any BreachLab level below.
      </p>
      <SubmitForm />
    </div>
  );
}
```

- [ ] **Step 2: Create the form**

```tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitFlagAction } from "@/app/submit/actions";

const initialState = {
  ok: false,
  error: null as string | null,
  message: null as string | null,
};

export function SubmitForm() {
  const [state, formAction] = useActionState(submitFlagAction, initialState);
  return (
    <form action={formAction} className="space-y-3 text-sm">
      <label className="block">
        <span className="block text-muted mb-1">Flag</span>
        <input
          name="flag"
          required
          placeholder="FLAG{...}"
          autoFocus
          className="w-full bg-bg border border-border p-2 text-text focus:outline-none focus:border-amber"
        />
      </label>
      {state.error && <p className="text-red text-xs">{state.error}</p>}
      {state.ok && state.message && (
        <p className="text-green text-xs">{state.message}</p>
      )}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-amber text-amber px-4 py-2 hover:bg-amber hover:text-bg disabled:opacity-50"
    >
      {pending ? "..." : "[ Submit ]"}
    </button>
  );
}
```

- [ ] **Step 3: Create the action**

```ts
"use server";

import { headers } from "next/headers";
import { getCurrentSession } from "@/lib/auth/session";
import { submitFlag } from "@/lib/tracks/submit";

type State = { ok: boolean; error: string | null; message: string | null };

export async function submitFlagAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const { user } = await getCurrentSession();
  if (!user) return { ok: false, error: "Not logged in", message: null };

  const raw = String(formData.get("flag") ?? "");
  if (!raw) return { ok: false, error: "Flag required", message: null };

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;

  const result = await submitFlag(user.id, raw, ip);
  if (!result.ok) return { ok: false, error: result.error, message: null };
  return {
    ok: true,
    error: null,
    message: `Captured Ghost level ${result.levelIdx} for ${result.points} pts`,
  };
}
```

- [ ] **Step 4: Build + commit**

```bash
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run build
git add -A
git commit -m "feat(tracks): /submit page with server action"
```

---

## Task 11: Leaderboard page (Global + stub tabs)

**Files:**
- Modify: `src/app/leaderboard/page.tsx`
- Create: `src/app/leaderboard/speedrun/page.tsx`
- Create: `src/app/leaderboard/first-bloods/page.tsx`
- Create: `src/components/leaderboard/LeaderboardTable.tsx`

- [ ] **Step 1: Create `LeaderboardTable`**

```tsx
import type { LeaderRow } from "@/lib/leaderboard/queries";

export function LeaderboardTable({ rows }: { rows: LeaderRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted text-sm">
        No operatives on the board yet. Be the first.
      </p>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted border-b border-border">
          <th className="text-left py-1">#</th>
          <th className="text-left py-1">Operative</th>
          <th className="text-right py-1">Solved</th>
          <th className="text-right py-1">Points</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.userId} className="border-b border-border/50">
            <td className="py-1 text-muted">{i + 1}</td>
            <td className="py-1">
              <span className="text-amber">@{r.username}</span>
            </td>
            <td className="py-1 text-right">{r.solved}</td>
            <td className="py-1 text-right">{r.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Replace `src/app/leaderboard/page.tsx`**

```tsx
import { getGlobalTop } from "@/lib/leaderboard/queries";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";

export default async function LeaderboardPage() {
  const rows = await getGlobalTop(100);
  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">Leaderboard</h1>
      <nav className="flex gap-4 text-sm border-b border-border pb-2">
        <span className="text-amber">Global</span>
        <a href="/leaderboard/speedrun" className="text-muted">
          Speedrun
        </a>
        <a href="/leaderboard/first-bloods" className="text-muted">
          First Bloods
        </a>
      </nav>
      <LeaderboardTable rows={rows} />
    </div>
  );
}
```

- [ ] **Step 3: Create stub `speedrun/page.tsx`**

```tsx
export default function SpeedrunPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">Speedrun leaderboard</h1>
      <p className="text-muted text-sm">Coming with Plan 05.</p>
    </div>
  );
}
```

- [ ] **Step 4: Create stub `first-bloods/page.tsx`**

```tsx
export default function FirstBloodsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">First Bloods</h1>
      <p className="text-muted text-sm">Coming with Plan 04.</p>
    </div>
  );
}
```

- [ ] **Step 5: Build + commit**

```bash
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run build
git add -A
git commit -m "feat(leaderboard): Global table + stub Speedrun/FirstBloods tabs"
```

---

## Task 12: Sidebar widgets wired to real data (LiveOps + TopFive)

**Files:**
- Modify: `src/components/LiveOpsWidget.tsx`
- Modify: `src/components/TopFiveWidget.tsx`

Both become async Server Components. Sidebar already supports async children.

- [ ] **Step 1: Replace `LiveOpsWidget`**

```tsx
import { getLiveStats } from "@/lib/leaderboard/queries";

export async function LiveOpsWidget() {
  const stats = await getLiveStats();
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Live Ops</h2>
      <ul className="text-sm space-y-1">
        <li>
          <span className="text-green">●</span> live
        </li>
        <li>{stats.operatives} operatives</li>
        <li>{stats.completionsToday} completions today</li>
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Replace `TopFiveWidget`**

```tsx
import Link from "next/link";
import { getGlobalTop } from "@/lib/leaderboard/queries";

export async function TopFiveWidget() {
  const rows = await getGlobalTop(5);
  const padded =
    rows.length >= 5
      ? rows
      : [
          ...rows,
          ...Array.from({ length: 5 - rows.length }, (_, i) => ({
            userId: `placeholder-${i}`,
            username: "—",
            points: 0,
            solved: 0,
          })),
        ];
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Top 5</h2>
      <ul className="text-sm space-y-1">
        {padded.slice(0, 5).map((row, i) => (
          <li
            key={row.userId}
            data-testid="top-five-row"
            className="flex justify-between"
          >
            <span>
              {i + 1}. {row.username === "—" ? "—" : `@${row.username}`}
            </span>
            <span className="text-muted">{row.points}</span>
          </li>
        ))}
      </ul>
      <Link href="/leaderboard" className="text-xs">
        [full board →]
      </Link>
    </section>
  );
}
```

- [ ] **Step 3: Update unit test for TopFiveWidget**

Replace `tests/unit/sidebar-widgets.test.tsx` TopFive block with a mocked async version, or just delete the TopFive and LiveOps subtests from that file — the e2e will cover them now. Minimal edit: delete the `describe("TopFiveWidget", …)` and `describe("LiveOpsWidget", …)` blocks (they queried the DB now and can't run in RTL).

- [ ] **Step 4: Run unit tests**

```bash
npm test
```

Expected: the sidebar widget test file shrinks but still passes.

- [ ] **Step 5: Build + commit**

```bash
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run build
git add -A
git commit -m "feat(sidebar): wire LiveOps and TopFive to real DB queries"
```

---

## Task 13: SSE endpoint + RecentTickerWidget (client) subscribes

**Files:**
- Create: `src/app/api/live/events/route.ts`
- Modify: `src/components/RecentTickerWidget.tsx` (becomes client component)

- [ ] **Step 1: Create the SSE route**

```ts
import { liveBus } from "@/lib/live/bus";
import type { LiveEvent } from "@/lib/live/events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: LiveEvent) => {
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };
      const unsubscribe = liveBus.subscribe(send);
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15_000);
      // Close handler — Next wires this via the controller's cancel
      (controller as unknown as { __cleanup?: () => void }).__cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
    cancel(reason) {
      const cleanup = (this as unknown as { __cleanup?: () => void }).__cleanup;
      if (cleanup) cleanup();
      void reason;
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Replace `RecentTickerWidget` with client subscriber**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { LiveEvent } from "@/lib/live/events";

const MAX = 5;

export function RecentTickerWidget() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  useEffect(() => {
    const es = new EventSource("/api/live/events");
    es.onmessage = (msg) => {
      try {
        const ev = JSON.parse(msg.data) as LiveEvent;
        setEvents((prev) => [ev, ...prev].slice(0, MAX));
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, []);

  if (events.length === 0) {
    return (
      <section>
        <h2 className="text-muted text-sm uppercase mb-2">▸ Recent</h2>
        <ul className="text-xs space-y-1">
          <li data-testid="recent-event" className="text-muted">
            awaiting first operative
          </li>
        </ul>
      </section>
    );
  }
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Recent</h2>
      <ul className="text-xs space-y-1">
        {events.map((e, i) => (
          <li
            key={`${e.at}-${i}`}
            data-testid="recent-event"
            className="text-text"
          >
            <span className="text-amber">@{e.username}</span> owned{" "}
            {e.trackSlug} L{e.levelIdx}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Run unit tests (RTL handles client components)**

```bash
npm test
```

- [ ] **Step 4: Build + commit**

```bash
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run build
git add -A
git commit -m "feat(live): SSE endpoint and client ticker widget"
```

---

## Task 14: End-to-end spec — submit → leaderboard → sidebar

**Files:**
- Create: `tests/e2e/tracks.spec.ts`

This test:
1. Seeds the Ghost track through a direct SQL helper (so it runs in CI without needing the seed script)
2. Registers a user
3. Submits a known flag
4. Visits the leaderboard and asserts the user appears
5. Visits `/` and asserts the Top 5 sidebar widget shows the user

- [ ] **Step 1: Create the spec**

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

const FLAG = "FLAG{ghost_l0_tracks_e2e}";

test.describe("tracks + leaderboard", () => {
  test.beforeAll(async () => {
    // Ensure clean slate and seed one track + one level + one flag
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, flags, levels, tracks CASCADE`;
    const [track] = await sql`
      INSERT INTO tracks (slug, name, description, status, order_idx)
      VALUES ('ghost', 'Ghost', 'e2e', 'live', 0)
      RETURNING id
    `;
    const [level] = await sql`
      INSERT INTO levels (track_id, idx, title, points_base, points_first_blood_bonus)
      VALUES (${track.id}, 0, 'First Contact', 100, 50)
      RETURNING id
    `;
    await sql`
      INSERT INTO flags (level_id, flag_hash)
      VALUES (${level.id}, ${sha256Hex(FLAG)})
    `;
  });

  test.afterAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, flags, levels, tracks CASCADE`;
    await sql.end();
  });

  test("register, submit flag, appear on leaderboard and top 5", async ({ page }) => {
    const username = `track_op_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    // Register
    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    // Submit the known flag
    await page.goto("/submit");
    await page.fill('input[name="flag"]', FLAG);
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Captured Ghost level 0/)).toBeVisible();

    // Leaderboard shows the user
    await page.goto("/leaderboard");
    await expect(page.getByText(`@${username}`)).toBeVisible();

    // Top 5 sidebar widget on home also shows them
    await page.goto("/");
    await expect(
      page.locator('[data-testid="top-five-row"]', { hasText: username })
    ).toBeVisible();
  });

  test("invalid flag rejected", async ({ page }) => {
    const username = `track_op2_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";
    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    await page.goto("/submit");
    await page.fill('input[name="flag"]', "FLAG{not_a_real_flag}");
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Unknown flag/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
docker compose up -d db
sleep 3
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run test:e2e
```

Expected: all existing tests still pass + new tracks tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(tracks): end-to-end submit -> leaderboard -> sidebar top 5"
```

---

## Task 15: Final sanity sweep + tag

- [ ] **Step 1: Run all tests**

```bash
npm test && DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run test:e2e
```

Expected: unit + e2e all green.

- [ ] **Step 2: Manual dev smoke (optional)**

```bash
docker compose up -d db
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run seed:ghost
DATABASE_URL=postgres://breachlab:breachlab@127.0.0.1:5432/breachlab npm run dev
```

Visit:
- `http://localhost:3000/tracks/ghost` — 9 levels listed
- Register an account, visit `/submit`, paste a flag from `.seed-flags.ghost.local.txt`
- Visit `/leaderboard` — see yourself
- Visit `/` — sidebar Top 5 shows you, Recent ticker slides in when you submit (open second tab)

Stop dev server, `docker compose down`.

- [ ] **Step 3: Tag**

```bash
git tag -a v0.3.0-tracks -m "BreachLab Platform: tracks, flag submission, global leaderboard, live ticker"
```

- [ ] **Step 4: Update Obsidian**

Append a Changelog entry to `~/Documents/Obsidian Vault/Claude Brain/Projects/BreachLab.md` noting Plan 03 shipped locally.

---

## Spec Coverage Check

- §5 Data model — `tracks`, `levels`, `flags`, `submissions` → Task 1
- §6.3 Playing Ghost (flag submission flow) → Tasks 6, 9, 10
- §7 Sidebar real data (Live Ops, Top 5, Recent) → Tasks 12, 13
- §9 v1 — leaderboard (global) + recent ticker delivered

## Notes for Engineer

- First blood **bonus points** are computed here, but badges are written in Plan 04. Don't add badge logic.
- The live bus is intentionally in-process. Plan 05 or later will move it to Redis pub/sub once we need multiple web replicas.
- Flag submission is one-shot per (user, level) — the second submit returns "Already solved".
- The seed script's plaintext output is gitignored. Boss will later copy those flag values into the real Ghost container filesystem to wire `ssh ghost0@...` play to site submission.
- Points curve: `100 + idx * 20` so Ghost gives 100, 120, 140, …, 260 for levels 0–8. Total clean run = 1620 points. Adjust later after balancing.
