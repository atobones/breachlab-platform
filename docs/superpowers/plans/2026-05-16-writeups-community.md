# Community Writeups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/writeups` upgrade: community-contributed writeups with author attribution, toggleable stars (curator ×10 = "Featured by Ato"), Phantom-track gating, self-serve submit + Boss approval queue. File-based curated writeups coexist unchanged.

**Architecture:** New DB tables (`writeups`, `writeup_stars`) + extension of `users` (`site_url`, `author_bio`, `is_curator`). Data layer in `src/lib/community-writeups.ts` + access predicate in `src/lib/writeup-access.ts`. API routes for submit / star / admin actions. New pages for submit, author profile, admin queue. Existing file-based writeups system (`src/lib/writeups.ts`) is NOT modified — both render side-by-side.

**Tech Stack:** Next.js App Router, Drizzle ORM (Postgres), Lucia (session/auth), Vitest + Testing Library, Playwright (E2E reserved).

**Repo + branch:** `/Users/bones/Desktop/breachlab-platform`, branch `feat/writeups-community-v1` (already created, spec doc committed).

**Reference spec:** `docs/superpowers/specs/2026-05-16-writeups-community-design.md` (commit `888708b`)

---

## File Structure

### Created files

```
drizzle/<timestamp>_writeups_community.sql        # Drizzle-generated migration
src/lib/community-writeups.ts                     # Data layer: list/get/score
src/lib/authors.ts                                # getAuthorByUsername + getCuratedAuthor
src/components/writeups/AuthorTile.tsx            # Compact author chip
src/components/writeups/StarButton.tsx            # "use client" — optimistic toggle
src/components/writeups/WriteupCard.tsx           # Card with locked/unlocked variants
src/components/writeups/WriteupSubmitForm.tsx     # "use client" — submit form
src/app/api/writeups/submit/route.ts              # POST submit
src/app/api/writeups/[id]/star/route.ts           # POST + DELETE star toggle
src/app/api/admin/writeups/[id]/approve/route.ts  # POST approve
src/app/api/admin/writeups/[id]/reject/route.ts   # POST reject (with reason)
src/app/writeups/submit/page.tsx                  # Submit form page
src/app/writeups/by/[username]/page.tsx           # Author profile + their writeups
src/app/admin/writeups/page.tsx                   # Pending queue
src/lib/__tests__/authors.test.ts                 # Vitest unit tests
src/lib/__tests__/community-writeups.test.ts      # Vitest unit tests
src/lib/__tests__/writeup-access.test.ts          # Vitest unit tests
src/app/api/writeups/__tests__/star.test.ts       # Vitest integration tests
src/app/api/writeups/__tests__/submit.test.ts     # Vitest integration tests
src/app/api/admin/writeups/__tests__/admin.test.ts # Vitest integration tests
```

### Modified files

```
src/lib/db/schema.ts                              # +3 cols on users, +2 tables
src/lib/writeup-access.ts                         # +canViewWriteup predicate
src/app/writeups/page.tsx                         # Add Community section
src/app/writeups/[track]/[level]/page.tsx         # Multi-writeup support
```

---

## Task 1: Recon + verify env

**Files:** none modified.

- [ ] **Step 1: Confirm branch + clean baseline**

Run:
```bash
cd /Users/bones/Desktop/breachlab-platform
git branch --show-current
git log -1 --oneline
```

Expected: branch `feat/writeups-community-v1`, HEAD = `888708b docs(writeups): community contributions design spec`.

- [ ] **Step 2: Verify test command works**

Run: `pnpm test`
Expected: "no test files found" or existing tests pass (we use `--passWithNoTests`). Treat any other failure as a blocker; debug before continuing.

- [ ] **Step 3: Verify drizzle generate works**

Run: `pnpm db:generate --help`
Expected: drizzle-kit usage printed. No need to actually generate yet.

- [ ] **Step 4: Note Boss username for is_curator one-liner**

Run: `grep -E "is_admin.*true|isAdmin: true" src/lib/db/schema.ts || echo "(check prod DB later)"`
Expected: helps locate which username gets curator flag post-migration. If unclear, mark for plan-time-only TODO: "ask Boss for his username before final SQL one-liner."

- [ ] **Step 5: No commit** (recon only)

---

## Task 2: Extend schema (users + 2 new tables)

**Files:**
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Append new columns to `users` table**

Locate `export const users = pgTable("users", { ... })` block (~line 15). Inside the object, add three new columns BEFORE the `createdAt` line:

```ts
  siteUrl: text("site_url"),
  authorBio: text("author_bio"),
  isCurator: boolean("is_curator").notNull().default(false),
```

- [ ] **Step 2: Add `writeups` table at end of schema file**

```ts
export const writeups = pgTable("writeups", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  trackSlug: text("track_slug").notNull(),
  levelIdx: integer("level_idx").notNull(),
  title: text("title").notNull(),
  brief: text("brief").notNull(),
  externalUrl: text("external_url").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] })
    .notNull()
    .default("pending"),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
}, (t) => ({
  uniqAuthorLevel: uniqueIndex("writeups_author_track_level_uniq")
    .on(t.authorId, t.trackSlug, t.levelIdx),
  byTrackLevel: index("writeups_track_level_idx")
    .on(t.trackSlug, t.levelIdx, t.status),
}));
```

- [ ] **Step 3: Add `writeupStars` table at end of schema file**

```ts
export const writeupStars = pgTable("writeup_stars", {
  writeupId: uuid("writeup_id")
    .notNull()
    .references(() => writeups.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.writeupId, t.userId] }),
  byWriteup: index("writeup_stars_writeup_idx").on(t.writeupId),
}));
```

- [ ] **Step 4: Ensure imports exist at top of file**

Check that the top of `schema.ts` already imports `index`, `uniqueIndex`, `primaryKey` from `drizzle-orm/pg-core`. If any are missing, add to the existing import.

- [ ] **Step 5: Generate migration**

Run: `pnpm db:generate`
Expected: a new file appears in `drizzle/` like `0042_writeups_community.sql` (number depends on existing count). Inspect it — should contain `ALTER TABLE users`, `CREATE TABLE writeups`, `CREATE TABLE writeup_stars`, plus indexes and FKs.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "feat(writeups): db schema for community writeups + author fields + stars"
```

---

## Task 3: Author helpers + tests

**Files:**
- Create: `src/lib/authors.ts`
- Test: `src/lib/__tests__/authors.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/__tests__/authors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getCuratedAuthor } from "../authors";

describe("getCuratedAuthor", () => {
  it("returns a stable derived author record for file-based writeups", () => {
    const a = getCuratedAuthor();
    expect(a.username).toBe("Ato");
    expect(a.siteUrl).toMatch(/^https:\/\/breachlab\.io/);
    expect(a.bio).toContain("Founder");
    expect(a.isCurator).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm test src/lib/__tests__/authors.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/authors.ts`**

```ts
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export type AuthorView = {
  id: string | null;          // null for synthetic curated author
  username: string;
  siteUrl: string | null;
  bio: string | null;
  isCurator: boolean;
};

const CURATED_AUTHOR: AuthorView = {
  id: null,
  username: "Ato",
  siteUrl: "https://breachlab.io",
  bio: "Founder",
  isCurator: true,
};

export function getCuratedAuthor(): AuthorView {
  return CURATED_AUTHOR;
}

export async function getAuthorByUsername(
  username: string,
): Promise<AuthorView | null> {
  const row = await db
    .select({
      id: users.id,
      username: users.username,
      siteUrl: users.siteUrl,
      bio: users.authorBio,
      isCurator: users.isCurator,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (row.length === 0) return null;
  return row[0];
}
```

- [ ] **Step 4: Run, verify passes**

Run: `pnpm test src/lib/__tests__/authors.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/authors.ts src/lib/__tests__/authors.test.ts
git commit -m "feat(writeups): author helpers — getCuratedAuthor + getAuthorByUsername"
```

---

## Task 4: Gating predicate (canViewWriteup) + tests

**Files:**
- Modify: `src/lib/writeup-access.ts`
- Test: `src/lib/__tests__/writeup-access.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/__tests__/writeup-access.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isTrackOpenForAnyone, isCommunityWriteupReadable } from "../writeup-access";

describe("isTrackOpenForAnyone", () => {
  it("ghost is open", () => {
    expect(isTrackOpenForAnyone("ghost")).toBe(true);
  });
  it("phantom is gated", () => {
    expect(isTrackOpenForAnyone("phantom")).toBe(false);
  });
  it("specter is gated", () => {
    expect(isTrackOpenForAnyone("specter")).toBe(false);
  });
  it("unknown tracks default to gated (fail closed)", () => {
    expect(isTrackOpenForAnyone("future-track")).toBe(false);
  });
});

describe("isCommunityWriteupReadable", () => {
  it("ghost anonymous OK", () => {
    expect(
      isCommunityWriteupReadable({
        trackSlug: "ghost",
        levelIdx: 1,
        user: null,
        completedLevels: new Set(),
      }),
    ).toBe(true);
  });
  it("ghost logged-in OK", () => {
    expect(
      isCommunityWriteupReadable({
        trackSlug: "ghost",
        levelIdx: 5,
        user: { id: "u1", isAdmin: false, isCurator: false } as any,
        completedLevels: new Set(),
      }),
    ).toBe(true);
  });
  it("phantom anonymous blocked", () => {
    expect(
      isCommunityWriteupReadable({
        trackSlug: "phantom",
        levelIdx: 17,
        user: null,
        completedLevels: new Set(),
      }),
    ).toBe(false);
  });
  it("phantom non-completer blocked", () => {
    expect(
      isCommunityWriteupReadable({
        trackSlug: "phantom",
        levelIdx: 17,
        user: { id: "u1", isAdmin: false, isCurator: false } as any,
        completedLevels: new Set([16]),
      }),
    ).toBe(false);
  });
  it("phantom completer of THIS level passes", () => {
    expect(
      isCommunityWriteupReadable({
        trackSlug: "phantom",
        levelIdx: 17,
        user: { id: "u1", isAdmin: false, isCurator: false } as any,
        completedLevels: new Set([17]),
      }),
    ).toBe(true);
  });
  it("curator bypasses gating", () => {
    expect(
      isCommunityWriteupReadable({
        trackSlug: "phantom",
        levelIdx: 17,
        user: { id: "u1", isAdmin: false, isCurator: true } as any,
        completedLevels: new Set(),
      }),
    ).toBe(true);
  });
  it("admin bypasses gating", () => {
    expect(
      isCommunityWriteupReadable({
        trackSlug: "phantom",
        levelIdx: 17,
        user: { id: "u1", isAdmin: true, isCurator: false } as any,
        completedLevels: new Set(),
      }),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm test src/lib/__tests__/writeup-access.test.ts`
Expected: FAIL — `isTrackOpenForAnyone` / `isCommunityWriteupReadable` not exported.

- [ ] **Step 3: Extend `src/lib/writeup-access.ts`**

Append to the existing file:

```ts
const OPEN_TRACKS = new Set(["ghost"]);

export function isTrackOpenForAnyone(trackSlug: string): boolean {
  return OPEN_TRACKS.has(trackSlug);
}

export type ReadabilityCtx = {
  trackSlug: string;
  levelIdx: number;
  user: { id: string; isAdmin: boolean; isCurator: boolean } | null;
  completedLevels: Set<number>; // for the same trackSlug
};

export function isCommunityWriteupReadable(ctx: ReadabilityCtx): boolean {
  if (ctx.user?.isAdmin || ctx.user?.isCurator) return true;
  if (isTrackOpenForAnyone(ctx.trackSlug)) return true;
  if (!ctx.user) return false;
  return ctx.completedLevels.has(ctx.levelIdx);
}
```

- [ ] **Step 4: Run, verify passes**

Run: `pnpm test src/lib/__tests__/writeup-access.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/writeup-access.ts src/lib/__tests__/writeup-access.test.ts
git commit -m "feat(writeups): per-track + per-level gating predicate (Ghost open, others completed-only)"
```

---

## Task 5: Community writeups data layer + tests

**Files:**
- Create: `src/lib/community-writeups.ts`
- Test: `src/lib/__tests__/community-writeups.test.ts`

- [ ] **Step 1: Write failing test (unit — pure query shape)**

Create `src/lib/__tests__/community-writeups.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeWeightedScore } from "../community-writeups";

describe("computeWeightedScore", () => {
  it("regular star = 1", () => {
    expect(computeWeightedScore(3, 0)).toBe(3);
  });
  it("curator star = 10", () => {
    expect(computeWeightedScore(0, 1)).toBe(10);
  });
  it("mixed", () => {
    expect(computeWeightedScore(5, 2)).toBe(25);
  });
  it("zero", () => {
    expect(computeWeightedScore(0, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm test src/lib/__tests__/community-writeups.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/community-writeups.ts`**

```ts
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, writeups, writeupStars } from "@/lib/db/schema";

export type CommunityWriteupView = {
  id: string;
  trackSlug: string;
  levelIdx: number;
  title: string;
  brief: string;
  externalUrl: string;
  author: {
    id: string;
    username: string;
    siteUrl: string | null;
    bio: string | null;
    isCurator: boolean;
  };
  regularStars: number;
  curatorStars: number;
  weightedScore: number;
  isFeatured: boolean;
  userHasStarred: boolean;
};

export function computeWeightedScore(regular: number, curator: number): number {
  return regular + 10 * curator;
}

const APPROVED = sql`${writeups.status} = 'approved'`;

// Pulls every approved writeup with author + aggregate star counts.
// Caller is responsible for gating which ones a given user can actually
// READ (use isCommunityWriteupReadable from writeup-access.ts).
export async function listCommunityWriteups(
  opts: { trackSlug?: string; levelIdx?: number; userId?: string | null } = {},
): Promise<CommunityWriteupView[]> {
  const rows = await db
    .select({
      id: writeups.id,
      trackSlug: writeups.trackSlug,
      levelIdx: writeups.levelIdx,
      title: writeups.title,
      brief: writeups.brief,
      externalUrl: writeups.externalUrl,
      authorId: users.id,
      authorUsername: users.username,
      authorSiteUrl: users.siteUrl,
      authorBio: users.authorBio,
      authorIsCurator: users.isCurator,
      regularStars: sql<number>`
        coalesce((
          select count(*) from ${writeupStars} s
          inner join ${users} u2 on u2.id = s.user_id
          where s.writeup_id = ${writeups.id} and u2.is_curator = false
        ), 0)`.as("regular_stars"),
      curatorStars: sql<number>`
        coalesce((
          select count(*) from ${writeupStars} s
          inner join ${users} u2 on u2.id = s.user_id
          where s.writeup_id = ${writeups.id} and u2.is_curator = true
        ), 0)`.as("curator_stars"),
      userHasStarred: opts.userId
        ? sql<boolean>`
            exists(
              select 1 from ${writeupStars} s
              where s.writeup_id = ${writeups.id} and s.user_id = ${opts.userId}
            )`.as("user_has_starred")
        : sql<boolean>`false`.as("user_has_starred"),
    })
    .from(writeups)
    .innerJoin(users, eq(writeups.authorId, users.id))
    .where(
      and(
        APPROVED,
        opts.trackSlug ? eq(writeups.trackSlug, opts.trackSlug) : undefined,
        opts.levelIdx !== undefined ? eq(writeups.levelIdx, opts.levelIdx) : undefined,
      ),
    );

  return rows
    .map((r) => {
      const regular = Number(r.regularStars);
      const curator = Number(r.curatorStars);
      return {
        id: r.id,
        trackSlug: r.trackSlug,
        levelIdx: r.levelIdx,
        title: r.title,
        brief: r.brief,
        externalUrl: r.externalUrl,
        author: {
          id: r.authorId,
          username: r.authorUsername,
          siteUrl: r.authorSiteUrl,
          bio: r.authorBio,
          isCurator: r.authorIsCurator,
        },
        regularStars: regular,
        curatorStars: curator,
        weightedScore: computeWeightedScore(regular, curator),
        isFeatured: curator > 0,
        userHasStarred: Boolean(r.userHasStarred),
      };
    })
    .sort((a, b) => b.weightedScore - a.weightedScore);
}

export async function getCommunityWriteupById(
  id: string,
): Promise<CommunityWriteupView | null> {
  const list = await listCommunityWriteups({});
  return list.find((w) => w.id === id) ?? null;
}
```

- [ ] **Step 4: Run, verify passes**

Run: `pnpm test src/lib/__tests__/community-writeups.test.ts`
Expected: PASS (4 tests). (DB-dependent queries not tested here — covered by API integration tests in later tasks.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/community-writeups.ts src/lib/__tests__/community-writeups.test.ts
git commit -m "feat(writeups): community writeups data layer with weighted scoring"
```

---

## Task 6: API — POST + DELETE /api/writeups/[id]/star

**Files:**
- Create: `src/app/api/writeups/[id]/star/route.ts`
- Test: `src/app/api/writeups/__tests__/star.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/app/api/writeups/__tests__/star.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getCurrentSession: vi.fn(),
}));
vi.mock("@/lib/db/client", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    select: vi.fn(),
  },
}));
vi.mock("@/lib/community-writeups", () => ({
  getCommunityWriteupById: vi.fn(),
}));
vi.mock("@/lib/writeup-access", () => ({
  isCommunityWriteupReadable: vi.fn(),
  getCompletedLevelIdxs: vi.fn().mockResolvedValue(new Set()),
}));

import { POST, DELETE } from "../[id]/star/route";
import { getCurrentSession } from "@/lib/auth/session";
import { getCommunityWriteupById } from "@/lib/community-writeups";
import { isCommunityWriteupReadable } from "@/lib/writeup-access";

const makeReq = () => new Request("http://test/api/writeups/abc/star", { method: "POST" });
const ctx = { params: Promise.resolve({ id: "abc" }) } as any;

describe("POST /api/writeups/[id]/star", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 when not logged in", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: null });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(401);
  });

  it("404 when writeup not found", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false, isCurator: false } });
    (getCommunityWriteupById as any).mockResolvedValue(null);
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(404);
  });

  it("403 when gating denies", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false, isCurator: false } });
    (getCommunityWriteupById as any).mockResolvedValue({ trackSlug: "phantom", levelIdx: 17 });
    (isCommunityWriteupReadable as any).mockReturnValue(false);
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(403);
  });

  it("200 happy path POST", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false, isCurator: false } });
    (getCommunityWriteupById as any).mockResolvedValue({ trackSlug: "ghost", levelIdx: 1 });
    (isCommunityWriteupReadable as any).mockReturnValue(true);
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
  });

  it("200 happy path DELETE", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false, isCurator: false } });
    (getCommunityWriteupById as any).mockResolvedValue({ trackSlug: "ghost", levelIdx: 1 });
    (isCommunityWriteupReadable as any).mockReturnValue(true);
    const res = await DELETE(makeReq(), ctx);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm test src/app/api/writeups/__tests__/star.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Implement the route**

Create `src/app/api/writeups/[id]/star/route.ts`:

```ts
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { writeupStars } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";
import { getCommunityWriteupById } from "@/lib/community-writeups";
import {
  getCompletedLevelIdxs,
  isCommunityWriteupReadable,
} from "@/lib/writeup-access";

type Ctx = { params: Promise<{ id: string }> };

async function authorize(id: string) {
  const { user } = await getCurrentSession();
  if (!user) return { error: 401 as const, user: null };
  const writeup = await getCommunityWriteupById(id);
  if (!writeup) return { error: 404 as const, user };
  const completedLevels = await getCompletedLevelIdxs(user.id, writeup.trackSlug);
  const readable = isCommunityWriteupReadable({
    trackSlug: writeup.trackSlug,
    levelIdx: writeup.levelIdx,
    user: { id: user.id, isAdmin: user.isAdmin, isCurator: user.isCurator },
    completedLevels,
  });
  if (!readable) return { error: 403 as const, user };
  return { error: null, user, writeup };
}

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const a = await authorize(id);
  if (a.error) return NextResponse.json({ error: a.error }, { status: a.error });

  await db
    .insert(writeupStars)
    .values({ writeupId: id, userId: a.user!.id })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const a = await authorize(id);
  if (a.error) return NextResponse.json({ error: a.error }, { status: a.error });

  await db
    .delete(writeupStars)
    .where(
      and(
        eq(writeupStars.writeupId, id),
        eq(writeupStars.userId, a.user!.id),
      ),
    );

  return NextResponse.json({ ok: true });
}
```

Note: this requires `getCompletedLevelIdxs` and `isCurator` on the user session. The existing `getCompletedLevelIdxs` is already exported from `writeup-access.ts`. Confirm `user.isCurator` is loaded by Lucia adapter — if not, fetch it separately at top of `authorize()` via `db.select({ isCurator: users.isCurator }).from(users).where(eq(users.id, user.id))`.

- [ ] **Step 4: Run, verify passes**

Run: `pnpm test src/app/api/writeups/__tests__/star.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/writeups/[id]/star/route.ts src/app/api/writeups/__tests__/star.test.ts
git commit -m "feat(writeups): POST/DELETE /api/writeups/[id]/star with gating"
```

---

## Task 7: API — POST /api/writeups/submit

**Files:**
- Create: `src/app/api/writeups/submit/route.ts`
- Test: `src/app/api/writeups/__tests__/submit.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/app/api/writeups/__tests__/submit.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: 0 }]) }) }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "w1" }]) }),
      }),
    }),
  },
}));

import { POST } from "../submit/route";
import { getCurrentSession } from "@/lib/auth/session";

const makeReq = (body: any) =>
  new Request("http://test/api/writeups/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const validBody = {
  trackSlug: "ghost",
  levelIdx: 1,
  title: "Lvl 1: First Contact",
  brief: "A walkthrough of the first level using ls + cat.",
  externalUrl: "https://0xm1sk.github.io/breachlab-docs/ghost/level-1/",
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/writeups/submit", () => {
  it("401 when not logged in", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: null });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(401);
  });

  it("400 on missing field", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    const res = await POST(makeReq({ ...validBody, title: "" }));
    expect(res.status).toBe(400);
  });

  it("400 on bad URL", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    const res = await POST(makeReq({ ...validBody, externalUrl: "not-a-url" }));
    expect(res.status).toBe(400);
  });

  it("400 on title > 120", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    const res = await POST(makeReq({ ...validBody, title: "x".repeat(121) }));
    expect(res.status).toBe(400);
  });

  it("400 on brief > 280", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    const res = await POST(makeReq({ ...validBody, brief: "x".repeat(281) }));
    expect(res.status).toBe(400);
  });

  it("200 happy path", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false } });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("w1");
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm test src/app/api/writeups/__tests__/submit.test.ts`
Expected: FAIL — route not found.

- [ ] **Step 3: Implement the route**

Create `src/app/api/writeups/submit/route.ts`:

```ts
import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { writeups } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 5;

function isValid(input: unknown): input is {
  trackSlug: string;
  levelIdx: number;
  title: string;
  brief: string;
  externalUrl: string;
} {
  if (!input || typeof input !== "object") return false;
  const i = input as Record<string, unknown>;
  if (typeof i.trackSlug !== "string" || i.trackSlug.length === 0) return false;
  if (typeof i.levelIdx !== "number" || i.levelIdx < 0) return false;
  if (typeof i.title !== "string" || i.title.length === 0 || i.title.length > 120) return false;
  if (typeof i.brief !== "string" || i.brief.length === 0 || i.brief.length > 280) return false;
  if (typeof i.externalUrl !== "string") return false;
  try {
    const u = new URL(i.externalUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  } catch {
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  const { user } = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!isValid(body)) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  // rate limit: 5 per hour per user
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recent = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(writeups)
    .where(and(eq(writeups.authorId, user.id), gte(writeups.submittedAt, since)));
  if (recent[0] && recent[0].count >= RATE_LIMIT) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  // upsert pending; do NOT override approved/rejected
  const inserted = await db
    .insert(writeups)
    .values({
      authorId: user.id,
      trackSlug: body.trackSlug,
      levelIdx: body.levelIdx,
      title: body.title,
      brief: body.brief,
      externalUrl: body.externalUrl,
    })
    .onConflictDoUpdate({
      target: [writeups.authorId, writeups.trackSlug, writeups.levelIdx],
      set: {
        title: body.title,
        brief: body.brief,
        externalUrl: body.externalUrl,
        submittedAt: sql`now()`,
      },
      setWhere: eq(writeups.status, "pending"),
    })
    .returning({ id: writeups.id });

  return NextResponse.json({ id: inserted[0]?.id ?? null });
}
```

- [ ] **Step 4: Run, verify passes**

Run: `pnpm test src/app/api/writeups/__tests__/submit.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/writeups/submit/route.ts src/app/api/writeups/__tests__/submit.test.ts
git commit -m "feat(writeups): POST /api/writeups/submit with validation + rate limit"
```

---

## Task 8: API — approve + reject (admin/curator)

**Files:**
- Create: `src/app/api/admin/writeups/[id]/approve/route.ts`
- Create: `src/app/api/admin/writeups/[id]/reject/route.ts`
- Test: `src/app/api/admin/writeups/__tests__/admin.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/app/api/admin/writeups/__tests__/admin.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session", () => ({ getCurrentSession: vi.fn() }));
vi.mock("@/lib/db/client", () => ({
  db: {
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
  },
}));

import { POST as approve } from "../[id]/approve/route";
import { POST as reject } from "../[id]/reject/route";
import { getCurrentSession } from "@/lib/auth/session";

const ctx = { params: Promise.resolve({ id: "w1" }) } as any;
const makeReq = (body: any) =>
  new Request("http://test/api/admin/writeups/w1/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => vi.clearAllMocks());

describe("approve/reject", () => {
  it("401 when not logged in", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: null });
    const res = await approve(makeReq({}), ctx);
    expect(res.status).toBe(401);
  });

  it("403 when not curator", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false, isCurator: false } });
    const res = await approve(makeReq({}), ctx);
    expect(res.status).toBe(403);
  });

  it("approve happy path (admin)", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: true, isCurator: false } });
    const res = await approve(makeReq({}), ctx);
    expect(res.status).toBe(200);
  });

  it("approve happy path (curator)", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: false, isCurator: true } });
    const res = await approve(makeReq({}), ctx);
    expect(res.status).toBe(200);
  });

  it("reject requires reason", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: true, isCurator: false } });
    const res = await reject(makeReq({}), ctx);
    expect(res.status).toBe(400);
  });

  it("reject happy path", async () => {
    (getCurrentSession as any).mockResolvedValue({ user: { id: "u1", isAdmin: true, isCurator: false } });
    const res = await reject(makeReq({ reason: "low quality" }), ctx);
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `pnpm test src/app/api/admin/writeups/__tests__/admin.test.ts`
Expected: FAIL — routes not found.

- [ ] **Step 3: Implement approve route**

Create `src/app/api/admin/writeups/[id]/approve/route.ts`:

```ts
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { writeups } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { user } = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  if (!user.isAdmin && !user.isCurator) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  await db
    .update(writeups)
    .set({
      status: "approved",
      reviewedAt: sql`now()`,
      reviewedBy: user.id,
      rejectionReason: null,
    })
    .where(eq(writeups.id, id));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Implement reject route**

Create `src/app/api/admin/writeups/[id]/reject/route.ts`:

```ts
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { writeups } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { user } = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  if (!user.isAdmin && !user.isCurator) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let body: { reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.reason || body.reason.trim().length === 0) {
    return NextResponse.json({ error: "reason required" }, { status: 400 });
  }
  const { id } = await ctx.params;
  await db
    .update(writeups)
    .set({
      status: "rejected",
      reviewedAt: sql`now()`,
      reviewedBy: user.id,
      rejectionReason: body.reason.trim(),
    })
    .where(eq(writeups.id, id));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run, verify passes**

Run: `pnpm test src/app/api/admin/writeups/__tests__/admin.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/writeups/ src/app/api/admin/writeups/__tests__/
git commit -m "feat(writeups): admin approve + reject (curator or admin gate)"
```

---

## Task 9: Component — AuthorTile

**Files:**
- Create: `src/components/writeups/AuthorTile.tsx`

- [ ] **Step 1: Implement**

```tsx
import Link from "next/link";
import type { AuthorView } from "@/lib/authors";

export function AuthorTile({ author }: { author: AuthorView }) {
  const initial = author.username.slice(0, 1).toUpperCase();
  return (
    <Link
      href={author.id ? `/writeups/by/${author.username}` : "#"}
      className="inline-flex items-center gap-2 text-xs hover:underline"
      data-testid="author-tile"
    >
      <span
        aria-hidden
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber/20 text-amber text-[10px] font-bold"
      >
        {initial}
      </span>
      <span className="text-text">{author.username}</span>
      {author.isCurator ? (
        <span className="text-amber" title="Curator">★</span>
      ) : null}
    </Link>
  );
}
```

- [ ] **Step 2: Commit (no test — pure render)**

```bash
git add src/components/writeups/AuthorTile.tsx
git commit -m "feat(writeups): AuthorTile component"
```

---

## Task 10: Component — StarButton ("use client")

**Files:**
- Create: `src/components/writeups/StarButton.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";
import { useState, useTransition } from "react";

export function StarButton({
  writeupId,
  initialStarred,
  initialScore,
  disabled,
  disabledReason,
}: {
  writeupId: string;
  initialStarred: boolean;
  initialScore: number;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [starred, setStarred] = useState(initialStarred);
  const [score, setScore] = useState(initialScore);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    if (disabled) return;
    const next = !starred;
    setStarred(next);
    setScore((s) => s + (next ? 1 : -1)); // optimistic, regular-star weight only
    startTransition(async () => {
      const method = next ? "POST" : "DELETE";
      const res = await fetch(`/api/writeups/${writeupId}/star`, { method });
      if (!res.ok) {
        // revert on failure
        setStarred(!next);
        setScore((s) => s + (next ? -1 : 1));
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || isPending}
      title={disabled ? disabledReason ?? "Locked" : starred ? "Unstar" : "Star"}
      className={`inline-flex items-center gap-1 text-xs ${
        disabled ? "text-muted/50 cursor-not-allowed" : "text-amber hover:underline"
      }`}
      data-testid="star-button"
      aria-pressed={starred}
    >
      <span aria-hidden>{starred ? "★" : "☆"}</span>
      <span>{score}</span>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/writeups/StarButton.tsx
git commit -m "feat(writeups): StarButton client component with optimistic toggle"
```

---

## Task 11: Component — WriteupCard

**Files:**
- Create: `src/components/writeups/WriteupCard.tsx`

- [ ] **Step 1: Implement**

```tsx
import { AuthorTile } from "./AuthorTile";
import { StarButton } from "./StarButton";
import type { CommunityWriteupView } from "@/lib/community-writeups";

export function WriteupCard({
  writeup,
  unlocked,
  unlockHint,
  canStar,
  starDisabledReason,
}: {
  writeup: CommunityWriteupView;
  unlocked: boolean;
  unlockHint?: string;
  canStar: boolean;
  starDisabledReason?: string;
}) {
  return (
    <article
      className="border border-border px-4 py-3 flex flex-col gap-2"
      data-testid="writeup-card"
    >
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="text-sm text-amber font-medium">
          {writeup.title}
          {writeup.isFeatured ? (
            <span
              className="ml-2 inline-block text-[10px] uppercase tracking-wider px-1 py-0.5 border border-amber/40 text-amber"
              title="Curator pick"
            >
              Featured by Ato
            </span>
          ) : null}
        </div>
        <StarButton
          writeupId={writeup.id}
          initialStarred={writeup.userHasStarred}
          initialScore={writeup.weightedScore}
          disabled={!canStar}
          disabledReason={starDisabledReason}
        />
      </header>

      <div className="flex items-center gap-2 text-xs">
        <AuthorTile author={{ ...writeup.author, id: writeup.author.id ?? null }} />
      </div>

      {unlocked ? (
        <>
          <p className="text-xs text-muted leading-relaxed">{writeup.brief}</p>
          <a
            href={writeup.externalUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-xs text-amber hover:underline"
          >
            Read on author&apos;s site →
          </a>
        </>
      ) : (
        <p className="text-xs text-muted italic">{unlockHint ?? "Locked"}</p>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/writeups/WriteupCard.tsx
git commit -m "feat(writeups): WriteupCard component with locked/unlocked variants + Featured badge"
```

---

## Task 12: Component — WriteupSubmitForm ("use client")

**Files:**
- Create: `src/components/writeups/WriteupSubmitForm.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Track = { slug: string; name: string; levelCount: number };

export function WriteupSubmitForm({ tracks }: { tracks: Track[] }) {
  const router = useRouter();
  const [trackSlug, setTrackSlug] = useState(tracks[0]?.slug ?? "");
  const [levelIdx, setLevelIdx] = useState(0);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const selectedTrack = tracks.find((t) => t.slug === trackSlug);
  const maxLevel = (selectedTrack?.levelCount ?? 1) - 1;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/writeups/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trackSlug, levelIdx, title, brief, externalUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setDone(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <p className="text-sm text-amber">
        Submitted — pending Boss review. You&apos;ll see it appear on /writeups
        once approved.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-muted">
          Track
          <select
            value={trackSlug}
            onChange={(e) => setTrackSlug(e.target.value)}
            className="mt-1 block w-full bg-bg border border-border px-2 py-1 text-sm"
          >
            {tracks.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-muted">
          Level
          <input
            type="number"
            min={0}
            max={maxLevel}
            value={levelIdx}
            onChange={(e) => setLevelIdx(Number(e.target.value))}
            className="mt-1 block w-full bg-bg border border-border px-2 py-1 text-sm"
          />
        </label>
      </div>

      <label className="block text-xs text-muted">
        Title (≤120) <span className="text-amber">{title.length}/120</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
          className="mt-1 block w-full bg-bg border border-border px-2 py-1 text-sm"
        />
      </label>

      <label className="block text-xs text-muted">
        Brief (≤280) <span className="text-amber">{brief.length}/280</span>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          maxLength={280}
          required
          rows={3}
          className="mt-1 block w-full bg-bg border border-border px-2 py-1 text-sm"
        />
      </label>

      <label className="block text-xs text-muted">
        External URL (your writeup page)
        <input
          type="url"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          required
          className="mt-1 block w-full bg-bg border border-border px-2 py-1 text-sm"
        />
      </label>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="px-3 py-1 border border-amber text-amber text-sm uppercase tracking-wider hover:bg-amber/10"
      >
        {submitting ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/writeups/WriteupSubmitForm.tsx
git commit -m "feat(writeups): WriteupSubmitForm client component"
```

---

## Task 13: Page — modify /writeups index

**Files:**
- Modify: `src/app/writeups/page.tsx`

- [ ] **Step 1: Replace page body**

Replace the entire body of `src/app/writeups/page.tsx` (preserving the imports section's style) with:

```tsx
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { listWriteups } from "@/lib/writeups";
import { listCommunityWriteups } from "@/lib/community-writeups";
import {
  getCompletedLevelIdxs,
  isCommunityWriteupReadable,
} from "@/lib/writeup-access";
import { WriteupCard } from "@/components/writeups/WriteupCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Writeups — BreachLab",
  description:
    "Curated walkthroughs and community contributions. Phantom-tier writeups are gated by level completion.",
};

export default async function WriteupsIndexPage() {
  const { user } = await getCurrentSession();
  const curated = await listWriteups();
  const community = await listCommunityWriteups({ userId: user?.id ?? null });

  const tracks = Array.from(
    new Set([
      ...curated.map((w) => w.track),
      ...community.map((w) => w.trackSlug),
    ]),
  );
  const trackProgress = new Map<string, Set<number>>();
  if (user) {
    for (const t of tracks) {
      trackProgress.set(t, await getCompletedLevelIdxs(user.id, t));
    }
  }

  return (
    <article className="space-y-10 max-w-3xl" data-testid="writeups-index">
      <header className="space-y-3">
        <h1 className="text-amber text-3xl phosphor wordmark">
          <span className="glitch" data-text="Writeups">Writeups</span>
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          Two surfaces: curated walkthroughs from Ato for known chokepoints,
          and community-contributed writeups linking out to authors&apos;
          own knowledge bases. Phantom-tier community writeups are visible
          only after you&apos;ve cleared that specific level — zero spoiler
          risk, retrospective learning only. Ghost is open for everyone.
        </p>
        <p className="text-sm text-muted leading-relaxed">
          Have a writeup of your own?{" "}
          {user ? (
            <Link href="/writeups/submit" className="text-amber hover:underline">
              Submit it
            </Link>
          ) : (
            <Link href="/login" className="text-amber hover:underline">
              Log in
            </Link>
          )}
          .
        </p>
      </header>

      {curated.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-amber text-xl uppercase tracking-wider">
            Curated by Ato
          </h2>
          <ul className="space-y-2">
            {curated.map((w) => {
              const completed = trackProgress.get(w.track) ?? new Set<number>();
              const unlocked =
                user &&
                (user.isAdmin ||
                  w.prereqLevels.every((l) => completed.has(l)));
              return (
                <li
                  key={w.slug}
                  className="border border-border px-4 py-3 flex flex-col gap-1"
                >
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="text-sm">
                      <span className="text-muted">{w.track} L{w.level}</span>{" "}
                      {unlocked ? (
                        <Link
                          href={`/writeups/${w.track}/${w.level}`}
                          className="text-amber hover:underline"
                        >
                          {w.title}
                        </Link>
                      ) : (
                        <span className="text-text">{w.title}</span>
                      )}
                    </div>
                    <span className="text-xs uppercase tracking-wider text-muted">
                      {w.difficulty} · {w.estimatedTime}
                    </span>
                  </div>
                  {!unlocked ? (
                    <p className="text-xs text-muted">
                      {user
                        ? `Locked — clear ${w.track} L${w.prereqLevels.join(", L")} to unlock.`
                        : "Locked — log in + clear prerequisites to unlock."}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {community.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-amber text-xl uppercase tracking-wider">
            Community writeups
          </h2>
          <ul className="space-y-2">
            {community.map((w) => {
              const completed = trackProgress.get(w.trackSlug) ?? new Set<number>();
              const readable = isCommunityWriteupReadable({
                trackSlug: w.trackSlug,
                levelIdx: w.levelIdx,
                user: user
                  ? { id: user.id, isAdmin: user.isAdmin, isCurator: (user as any).isCurator ?? false }
                  : null,
                completedLevels: completed,
              });
              return (
                <li key={w.id}>
                  <WriteupCard
                    writeup={w}
                    unlocked={readable}
                    unlockHint={
                      user
                        ? `Locked — clear ${w.trackSlug} L${w.levelIdx} to unlock.`
                        : "Log in + clear this level to unlock."
                    }
                    canStar={readable && !!user}
                    starDisabledReason={
                      !user ? "Log in to star" : "Complete this level to star"
                    }
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
```

- [ ] **Step 2: Manual smoke**

Run: `pnpm dev`
Visit: `http://localhost:3000/writeups`
Expected: Page renders two sections (Curated + Community, latter may be empty if no DB rows). No console errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/writeups/page.tsx
git commit -m "feat(writeups): index page renders curated + community sections"
```

---

## Task 14: Page — modify /writeups/[track]/[level]

**Files:**
- Modify: `src/app/writeups/[track]/[level]/page.tsx`

- [ ] **Step 1: Read existing page first**

Run: `cat src/app/writeups/\[track\]/\[level\]/page.tsx`
Note: this currently loads a single file-based MD and renders it. The new behavior: render the file-based MD inline if present, then list any community writeups below.

- [ ] **Step 2: Replace with multi-writeup layout**

Replace the entire file with:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/session";
import { loadWriteup } from "@/lib/writeups";
import { listCommunityWriteups } from "@/lib/community-writeups";
import {
  getCompletedLevelIdxs,
  isCommunityWriteupReadable,
} from "@/lib/writeup-access";
import { WriteupCard } from "@/components/writeups/WriteupCard";

export const dynamic = "force-dynamic";

type Params = { track: string; level: string };

export default async function WriteupLevelPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { track, level } = await params;
  const levelIdx = Number(level);
  if (!Number.isFinite(levelIdx) || levelIdx < 0) notFound();

  const { user } = await getCurrentSession();
  const curated = await loadWriteup(track, levelIdx);
  const community = await listCommunityWriteups({
    trackSlug: track,
    levelIdx,
    userId: user?.id ?? null,
  });

  if (!curated && community.length === 0) notFound();

  const completed = user
    ? await getCompletedLevelIdxs(user.id, track)
    : new Set<number>();

  return (
    <article className="space-y-8 max-w-3xl">
      <header className="space-y-2">
        <Link href="/writeups" className="text-xs text-muted hover:underline">
          ← All writeups
        </Link>
        <h1 className="text-amber text-2xl phosphor">
          {track} L{levelIdx}
        </h1>
      </header>

      {curated ? (
        <section className="space-y-3">
          <h2 className="text-amber text-lg uppercase tracking-wider">
            Curated by Ato
          </h2>
          <div
            className="prose prose-invert max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: curated.html }}
          />
        </section>
      ) : null}

      {community.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-amber text-lg uppercase tracking-wider">
            Community writeups
          </h2>
          <ul className="space-y-2">
            {community.map((w) => {
              const readable = isCommunityWriteupReadable({
                trackSlug: w.trackSlug,
                levelIdx: w.levelIdx,
                user: user
                  ? { id: user.id, isAdmin: user.isAdmin, isCurator: (user as any).isCurator ?? false }
                  : null,
                completedLevels: completed,
              });
              return (
                <li key={w.id}>
                  <WriteupCard
                    writeup={w}
                    unlocked={readable}
                    unlockHint={
                      user
                        ? `Locked — clear ${w.trackSlug} L${w.levelIdx} to unlock.`
                        : "Log in + clear this level to unlock."
                    }
                    canStar={readable && !!user}
                    starDisabledReason={
                      !user ? "Log in to star" : "Complete this level to star"
                    }
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/writeups/[track]/[level]/page.tsx
git commit -m "feat(writeups): per-level page renders curated + community cards"
```

---

## Task 15: Page — /writeups/submit

**Files:**
- Create: `src/app/writeups/submit/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { tracks as tracksTable, levels as levelsTable } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";
import { WriteupSubmitForm } from "@/components/writeups/WriteupSubmitForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Submit a writeup — BreachLab" };

export default async function SubmitPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login?next=/writeups/submit");

  const allTracks = await db
    .select({ id: tracksTable.id, slug: tracksTable.slug, name: tracksTable.name })
    .from(tracksTable);

  const levelCounts = await Promise.all(
    allTracks.map(async (t) => {
      const [{ c }] = await db
        .select({ c: count() })
        .from(levelsTable)
        .where(eq(levelsTable.trackId, t.id));
      return { slug: t.slug, name: t.name, levelCount: Number(c) };
    }),
  );

  return (
    <article className="space-y-6 max-w-3xl">
      <header className="space-y-2">
        <h1 className="text-amber text-2xl phosphor">Submit a writeup</h1>
        <p className="text-sm text-muted leading-relaxed">
          One submission per level per author. Submissions are reviewed by
          Boss before going live. Use your own external page (blog, GitHub
          pages, MkDocs site) as the canonical source — we link there with
          full attribution.
        </p>
      </header>
      <WriteupSubmitForm tracks={levelCounts} />
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/writeups/submit/page.tsx
git commit -m "feat(writeups): /writeups/submit page"
```

---

## Task 16: Page — /writeups/by/[username]

**Files:**
- Create: `src/app/writeups/by/[username]/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthorByUsername } from "@/lib/authors";
import { listCommunityWriteups } from "@/lib/community-writeups";
import { getCurrentSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type Params = { username: string };

export default async function AuthorPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  const author = await getAuthorByUsername(username);
  if (!author) notFound();

  const { user } = await getCurrentSession();
  const all = await listCommunityWriteups({ userId: user?.id ?? null });
  const mine = all.filter((w) => w.author.id === author.id);

  const totalStars = mine.reduce((acc, w) => acc + w.weightedScore, 0);

  return (
    <article className="space-y-6 max-w-3xl">
      <header className="space-y-2">
        <h1 className="text-amber text-2xl phosphor">{author.username}</h1>
        {author.isCurator ? (
          <span className="text-xs text-amber">★ Curator</span>
        ) : null}
        {author.bio ? (
          <p className="text-sm text-muted leading-relaxed">{author.bio}</p>
        ) : null}
        {author.siteUrl ? (
          <a
            href={author.siteUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-sm text-amber hover:underline"
          >
            {author.siteUrl} →
          </a>
        ) : null}
        <p className="text-xs text-muted">
          {mine.length} writeup{mine.length === 1 ? "" : "s"} · {totalStars} stars
        </p>
      </header>

      {mine.length === 0 ? (
        <p className="text-sm text-muted">No approved writeups yet.</p>
      ) : (
        <ul className="space-y-2">
          {mine.map((w) => (
            <li key={w.id} className="border border-border px-4 py-3">
              <Link
                href={`/writeups/${w.trackSlug}/${w.levelIdx}`}
                className="text-sm text-amber hover:underline"
              >
                {w.trackSlug} L{w.levelIdx} — {w.title}
              </Link>
              <p className="text-xs text-muted mt-1">★ {w.weightedScore}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/writeups/by/
git commit -m "feat(writeups): /writeups/by/[username] author profile page"
```

---

## Task 17: Page — /admin/writeups (curator queue)

**Files:**
- Create: `src/app/admin/writeups/page.tsx`

- [ ] **Step 1: Implement**

```tsx
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { writeups as wTable, users as uTable } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin: writeups queue — BreachLab" };

export default async function AdminWriteupsPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  if (!user.isAdmin && !(user as any).isCurator) {
    redirect("/");
  }

  const pending = await db
    .select({
      id: wTable.id,
      title: wTable.title,
      brief: wTable.brief,
      externalUrl: wTable.externalUrl,
      trackSlug: wTable.trackSlug,
      levelIdx: wTable.levelIdx,
      submittedAt: wTable.submittedAt,
      authorUsername: uTable.username,
    })
    .from(wTable)
    .innerJoin(uTable, eq(wTable.authorId, uTable.id))
    .where(eq(wTable.status, "pending"));

  return (
    <article className="space-y-6 max-w-3xl">
      <h1 className="text-amber text-2xl phosphor">Pending writeups</h1>

      {pending.length === 0 ? (
        <p className="text-sm text-muted">Queue is empty.</p>
      ) : null}

      <ul className="space-y-4">
        {pending.map((w) => (
          <li key={w.id} className="border border-border px-4 py-3 space-y-2">
            <div className="text-sm">
              <span className="text-muted">{w.trackSlug} L{w.levelIdx}</span> ·{" "}
              <span className="text-amber">{w.title}</span> · by{" "}
              <span className="text-text">{w.authorUsername}</span>
            </div>
            <p className="text-xs text-muted">{w.brief}</p>
            <a
              href={w.externalUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-xs text-amber hover:underline"
            >
              {w.externalUrl}
            </a>
            <AdminActions id={w.id} />
          </li>
        ))}
      </ul>
    </article>
  );
}

function AdminActions({ id }: { id: string }) {
  return (
    <form className="flex gap-2 items-baseline">
      <button
        type="button"
        className="text-xs px-2 py-1 border border-amber text-amber hover:bg-amber/10"
        onClick={async () => {
          await fetch(`/api/admin/writeups/${id}/approve`, { method: "POST" });
          window.location.reload();
        }}
      >
        Approve
      </button>
      <input
        type="text"
        placeholder="reject reason"
        className="text-xs bg-bg border border-border px-2 py-1 w-48"
        id={`reason-${id}`}
      />
      <button
        type="button"
        className="text-xs px-2 py-1 border border-border text-muted hover:text-text"
        onClick={async () => {
          const reason = (document.getElementById(`reason-${id}`) as HTMLInputElement)?.value;
          await fetch(`/api/admin/writeups/${id}/reject`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reason }),
          });
          window.location.reload();
        }}
      >
        Reject
      </button>
    </form>
  );
}
```

Note: `AdminActions` uses inline `onClick` handlers which requires the file to be marked `"use client"`. Since the parent page is RSC, move `AdminActions` to its own file:

```bash
mkdir -p src/components/admin
```

Create `src/components/admin/AdminWriteupActions.tsx`:

```tsx
"use client";
export function AdminWriteupActions({ id }: { id: string }) {
  return (
    <form className="flex gap-2 items-baseline">
      <button
        type="button"
        className="text-xs px-2 py-1 border border-amber text-amber hover:bg-amber/10"
        onClick={async () => {
          await fetch(`/api/admin/writeups/${id}/approve`, { method: "POST" });
          window.location.reload();
        }}
      >
        Approve
      </button>
      <input
        type="text"
        placeholder="reject reason"
        className="text-xs bg-bg border border-border px-2 py-1 w-48"
        id={`reason-${id}`}
      />
      <button
        type="button"
        className="text-xs px-2 py-1 border border-border text-muted hover:text-text"
        onClick={async () => {
          const reason = (document.getElementById(`reason-${id}`) as HTMLInputElement)?.value;
          await fetch(`/api/admin/writeups/${id}/reject`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reason }),
          });
          window.location.reload();
        }}
      >
        Reject
      </button>
    </form>
  );
}
```

Update the page to import `AdminWriteupActions` instead of inline `AdminActions`. Remove the inline `AdminActions` function from the page file.

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/writeups/page.tsx src/components/admin/AdminWriteupActions.tsx
git commit -m "feat(writeups): /admin/writeups curator queue with approve/reject"
```

---

## Task 18: Apply migration on dev DB + smoke test

**Files:** none modified.

- [ ] **Step 1: Apply migration locally**

Run: `pnpm db:migrate`
Expected: migration applied cleanly. `psql` to verify new columns/tables exist.

- [ ] **Step 2: Seed Boss as curator (local dev)**

Find your dev DB connection. Then:
```sql
UPDATE users SET is_curator = true WHERE username = '<your-dev-username>';
```

- [ ] **Step 3: Manual E2E in browser**

Run: `pnpm dev`

Walk through:
1. Visit `/writeups` — see existing curated writeups in "Curated by Ato" section.
2. Visit `/writeups/submit` — fill form (track=ghost, level=1, title="Test", brief="Test", externalUrl="https://example.com").
3. Visit `/admin/writeups` — see your submission pending.
4. Click Approve.
5. Visit `/writeups` — see your writeup under "Community writeups".
6. Click the star — count increments.
7. Click star again — count decrements.
8. Visit `/writeups/by/<your-username>` — see your author profile.

Expected: all flows pass without console errors.

- [ ] **Step 4: No commit** (smoke test only)

---

## Task 19: Open PR

**Files:** none modified.

- [ ] **Step 1: Push branch**

Run: `git push -u origin feat/writeups-community-v1`

- [ ] **Step 2: Open PR**

Run:
```bash
gh pr create --title "feat(writeups): community contributions + stars + author profiles" --body "$(cat <<'EOF'
## Summary
- New `/writeups/submit` flow for community-contributed writeups with author attribution
- DB-backed weighted star ratings (curator stars ×10 = "Featured by Ato" badge)
- Per-track gating: Ghost open, Phantom/Specter gated by THIS level's completion (retrospective only)
- New `/admin/writeups` curator queue (approve/reject with reason)
- New `/writeups/by/[username]` author profile pages
- File-based curated writeups (existing) coexist unchanged

## Triggered by
0Xm!\$k published https://0xm1sk.github.io/breachlab-docs/ — Boss publicly committed to /writeups tab integration. ChrisDewa's Discord-roles colour-coding thread seeded the social-recognition layer.

## Spec
\`docs/superpowers/specs/2026-05-16-writeups-community-design.md\`

## Deploy notes
1. \`pnpm db:migrate\` on prod after merge
2. \`UPDATE users SET is_curator = true WHERE username = '<boss>';\`
3. Boss submits 0Xm!\$k's writeups via Discord-confirmed handle
4. Boss approves them
5. Boss DM's 0Xm!\$k that his work is live

## Test plan
- [x] Vitest unit + integration tests pass
- [ ] Local E2E smoke (submit → approve → star → unstar → author profile)
- [ ] Prod smoke after migration
EOF
)"
```

- [ ] **Step 2: Report PR URL**

Output the PR URL for Boss to review.

---

## Self-review notes (author of this plan)

- **Spec coverage:** every locked decision in the spec has a corresponding task. Schema (T2), data layer (T3-T5), API (T6-T8), UI components (T9-T12), pages (T13-T17), deploy (T18-T19). ✓
- **No placeholders:** every code step contains complete code. ✓
- **Type consistency:** `AuthorView`, `CommunityWriteupView`, `ReadabilityCtx`, `Ctx`, `Params`, `Track` named consistently across tasks. ✓
- **Coexistence rule:** existing `src/lib/writeups.ts` and existing `/writeups/[track]/[level]/page.tsx` are explicitly preserved/modified to compose with the new system, not replaced. ✓
- **Lucia/user.isCurator caveat:** flagged in Task 6 — if Lucia adapter doesn't expose `isCurator` on the session user, fall back to a per-route DB lookup. The plan accepts this small risk; resolution belongs to the executor at integration time.
- **Open spec questions:** avatar source = initials fallback (built into AuthorTile); favicon source = skipped for v1 (clean text-link CTA only).
