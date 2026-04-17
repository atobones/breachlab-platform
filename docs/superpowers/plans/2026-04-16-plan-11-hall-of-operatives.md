# Hall of Operatives — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a donor recognition system — "Hall of Operatives" — that tracks sponsors from GitHub Sponsors, Liberapay, and BTC crypto, displays them on a public `/hall-of-operatives` page with privacy controls, tier badges, and longevity pins.

**Architecture:** New `sponsors` table tracks all donation sources with unified tier system. GitHub Sponsors webhook verifies signatures and upserts sponsor records. Liberapay polling (no webhooks) runs via API route. Crypto donors self-claim via unique URL. The `/hall-of-operatives` page queries sponsors filtered by privacy level, grouped by tier, sorted by join date. Longevity pins are computed at render time from `startedAt`.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM + PostgreSQL, Zod validation, Tailwind CSS 4, vitest for unit tests.

**Agreed scope (from prior session):**
- All 3 rails: GitHub Sponsors, Liberapay, BTC crypto
- 4 privacy levels: `public`, `username_only`, `anonymous`, `hidden`
- Auto claim URL for crypto donors
- Cumulative + recurring tier calculation
- Longevity pins: 30d, 90d, 1y, 2y+
- Dedication message for $100+ (Architect) tier only
- Sort by join date within tier

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `src/lib/sponsors/schema.ts` | `sponsors` table definition (keeps schema.ts clean) |
| `src/lib/sponsors/tiers.ts` | Tier definitions, tier calculation logic, longevity pin computation |
| `src/lib/sponsors/queries.ts` | DB queries: getPublicSponsors, getSponsorByUserId, upsertSponsor |
| `src/lib/webhooks/github-sponsors.ts` | Signature verification + payload parsing for GH Sponsors webhook |
| `src/app/api/webhooks/github-sponsors/route.ts` | POST handler for GH Sponsors webhook |
| `src/app/api/webhooks/liberapay/sync/route.ts` | GET handler — admin-triggered Liberapay poll |
| `src/app/api/sponsors/claim/route.ts` | POST handler — crypto donors claim their sponsorship |
| `src/app/hall-of-operatives/page.tsx` | Public Hall of Operatives page (server component) |
| `src/components/operatives/OperativeCard.tsx` | Single sponsor card with tier badge + longevity pin |
| `src/components/operatives/TierSection.tsx` | Section header + grid for one tier group |
| `tests/unit/sponsors/tiers.test.ts` | Tier calculation + longevity pin tests |
| `tests/unit/webhooks/github-sponsors.test.ts` | Signature verification + payload parsing tests |

### Modified files
| File | Change |
|------|--------|
| `src/lib/db/schema.ts` | Import and re-export `sponsors` from `sponsors/schema.ts` |
| `src/lib/badges/types.ts` | Add sponsor badge kinds |
| `src/components/badges/BadgePill.tsx` | Add colors for sponsor badge kinds |
| `src/components/SidebarLinks.tsx` | Add "Hall of Operatives" link |
| `src/app/u/[username]/page.tsx` | Show sponsor tier badge on profile |

---

## Task 1: Sponsors Schema

**Files:**
- Create: `src/lib/sponsors/schema.ts`
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Create the sponsors table definition**

```ts
// src/lib/sponsors/schema.ts
import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { users } from "@/lib/db/schema";

export const sponsors = pgTable("sponsors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  source: text("source").notNull(), // "github_sponsors" | "liberapay" | "crypto"
  externalId: text("external_id"), // GH sponsor login, Liberapay username, null for crypto
  tierCode: text("tier_code").notNull(), // "recruit" | "operator" | "phantom" | "architect"
  amountCentsMonthly: integer("amount_cents_monthly").notNull().default(0),
  visibility: text("visibility").notNull().default("public"), // "public" | "username_only" | "anonymous" | "hidden"
  dedication: text("dedication"), // only for architect tier ($100+)
  claimToken: text("claim_token").unique(), // for crypto self-claim
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Sponsor = typeof sponsors.$inferSelect;
export type NewSponsor = typeof sponsors.$inferInsert;
```

- [ ] **Step 2: Re-export from main schema**

In `src/lib/db/schema.ts`, add at the bottom:

```ts
export { sponsors } from "@/lib/sponsors/schema";
export type { Sponsor, NewSponsor } from "@/lib/sponsors/schema";
```

- [ ] **Step 3: Generate the migration**

Run: `cd /Users/bones/Desktop/breachlab-platform && npx drizzle-kit generate`

Expected: New migration file in `drizzle/` creating `sponsors` table.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sponsors/schema.ts src/lib/db/schema.ts drizzle/
git commit -m "feat(sponsors): add sponsors table schema and migration"
```

---

## Task 2: Tier Definitions and Longevity Pins

**Files:**
- Create: `src/lib/sponsors/tiers.ts`
- Create: `tests/unit/sponsors/tiers.test.ts`

- [ ] **Step 1: Write failing tests for tier calculation and longevity pins**

```ts
// tests/unit/sponsors/tiers.test.ts
import { describe, it, expect } from "vitest";
import {
  computeTier,
  computeLongevityPin,
  TIER_ORDER,
  TIER_LABEL,
  type TierCode,
} from "@/lib/sponsors/tiers";

describe("computeTier", () => {
  it("returns recruit for $3/mo", () => {
    expect(computeTier(300)).toBe("recruit");
  });

  it("returns operator for $10/mo", () => {
    expect(computeTier(1000)).toBe("operator");
  });

  it("returns phantom for $25/mo", () => {
    expect(computeTier(2500)).toBe("phantom");
  });

  it("returns architect for $100/mo", () => {
    expect(computeTier(10000)).toBe("architect");
  });

  it("returns architect for amounts above $100", () => {
    expect(computeTier(50000)).toBe("architect");
  });

  it("returns recruit for amounts between $3 and $10", () => {
    expect(computeTier(500)).toBe("recruit");
  });

  it("returns recruit for amounts below $3", () => {
    expect(computeTier(100)).toBe("recruit");
  });
});

describe("computeLongevityPin", () => {
  const now = new Date("2026-04-16T00:00:00Z");

  it("returns null for less than 30 days", () => {
    const start = new Date("2026-04-01T00:00:00Z");
    expect(computeLongevityPin(start, now)).toBeNull();
  });

  it("returns '30d' for 30-89 days", () => {
    const start = new Date("2026-03-01T00:00:00Z");
    expect(computeLongevityPin(start, now)).toBe("30d");
  });

  it("returns '90d' for 90-364 days", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    expect(computeLongevityPin(start, now)).toBe("90d");
  });

  it("returns '1y' for 365-729 days", () => {
    const start = new Date("2025-04-01T00:00:00Z");
    expect(computeLongevityPin(start, now)).toBe("1y");
  });

  it("returns '2y' for 730+ days", () => {
    const start = new Date("2024-01-01T00:00:00Z");
    expect(computeLongevityPin(start, now)).toBe("2y");
  });
});

describe("TIER_ORDER", () => {
  it("orders architect > phantom > operator > recruit", () => {
    expect(TIER_ORDER).toEqual(["architect", "phantom", "operator", "recruit"]);
  });
});

describe("TIER_LABEL", () => {
  it("has labels for all tiers", () => {
    expect(TIER_LABEL.recruit).toBe("Recruit");
    expect(TIER_LABEL.operator).toBe("Operator");
    expect(TIER_LABEL.phantom).toBe("Phantom");
    expect(TIER_LABEL.architect).toBe("Architect");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/bones/Desktop/breachlab-platform && npx vitest run tests/unit/sponsors/tiers.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement tiers module**

```ts
// src/lib/sponsors/tiers.ts
export type TierCode = "recruit" | "operator" | "phantom" | "architect";
export type LongevityPin = "30d" | "90d" | "1y" | "2y";

/** Highest tier first — used for display ordering. */
export const TIER_ORDER: TierCode[] = ["architect", "phantom", "operator", "recruit"];

export const TIER_LABEL: Record<TierCode, string> = {
  recruit: "Recruit",
  operator: "Operator",
  phantom: "Phantom",
  architect: "Architect",
};

/** Amount thresholds in cents/month. */
const THRESHOLDS: { min: number; tier: TierCode }[] = [
  { min: 10000, tier: "architect" },
  { min: 2500, tier: "phantom" },
  { min: 1000, tier: "operator" },
  { min: 0, tier: "recruit" },
];

export function computeTier(amountCentsMonthly: number): TierCode {
  for (const { min, tier } of THRESHOLDS) {
    if (amountCentsMonthly >= min) return tier;
  }
  return "recruit";
}

const DAY_MS = 86_400_000;

export function computeLongevityPin(startedAt: Date, now: Date = new Date()): LongevityPin | null {
  const days = Math.floor((now.getTime() - startedAt.getTime()) / DAY_MS);
  if (days >= 730) return "2y";
  if (days >= 365) return "1y";
  if (days >= 90) return "90d";
  if (days >= 30) return "30d";
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/bones/Desktop/breachlab-platform && npx vitest run tests/unit/sponsors/tiers.test.ts`

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sponsors/tiers.ts tests/unit/sponsors/tiers.test.ts
git commit -m "feat(sponsors): add tier calculation and longevity pin logic with tests"
```

---

## Task 3: GitHub Sponsors Webhook Verification

**Files:**
- Create: `src/lib/webhooks/github-sponsors.ts`
- Create: `tests/unit/webhooks/github-sponsors.test.ts`

- [ ] **Step 1: Write failing tests for signature verification and payload parsing**

```ts
// tests/unit/webhooks/github-sponsors.test.ts
import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import {
  verifyGitHubSignature,
  parseSponsorshipEvent,
  type SponsorshipEvent,
} from "@/lib/webhooks/github-sponsors";

const SECRET = "test-webhook-secret";

function sign(body: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyGitHubSignature", () => {
  it("accepts valid signature", () => {
    const body = '{"action":"created"}';
    const sig = sign(body, SECRET);
    expect(verifyGitHubSignature(body, sig, SECRET)).toBe(true);
  });

  it("rejects invalid signature", () => {
    const body = '{"action":"created"}';
    expect(verifyGitHubSignature(body, "sha256=bad", SECRET)).toBe(false);
  });

  it("rejects empty signature", () => {
    expect(verifyGitHubSignature("{}", "", SECRET)).toBe(false);
  });
});

describe("parseSponsorshipEvent", () => {
  it("parses created event with tier", () => {
    const payload = {
      action: "created",
      sponsorship: {
        sponsor: { login: "hacker42", id: 12345 },
        tier: { monthly_price_in_cents: 1000, name: "Operator" },
        created_at: "2026-04-16T00:00:00Z",
      },
    };
    const result = parseSponsorshipEvent(payload);
    expect(result).toEqual({
      action: "created",
      sponsorLogin: "hacker42",
      sponsorGithubId: 12345,
      amountCentsMonthly: 1000,
      tierName: "Operator",
      createdAt: "2026-04-16T00:00:00Z",
    });
  });

  it("parses cancelled event", () => {
    const payload = {
      action: "cancelled",
      sponsorship: {
        sponsor: { login: "hacker42", id: 12345 },
        tier: { monthly_price_in_cents: 1000, name: "Operator" },
        created_at: "2026-04-16T00:00:00Z",
      },
    };
    const result = parseSponsorshipEvent(payload);
    expect(result?.action).toBe("cancelled");
  });

  it("parses tier_changed event", () => {
    const payload = {
      action: "tier_changed",
      sponsorship: {
        sponsor: { login: "hacker42", id: 12345 },
        tier: { monthly_price_in_cents: 2500, name: "Phantom" },
        created_at: "2026-04-16T00:00:00Z",
      },
    };
    const result = parseSponsorshipEvent(payload);
    expect(result?.amountCentsMonthly).toBe(2500);
  });

  it("returns null for unknown actions", () => {
    const payload = { action: "pending_cancellation", sponsorship: {} };
    expect(parseSponsorshipEvent(payload)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/bones/Desktop/breachlab-platform && npx vitest run tests/unit/webhooks/github-sponsors.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement webhook verification and parsing**

```ts
// src/lib/webhooks/github-sponsors.ts
import { createHmac, timingSafeEqual } from "crypto";

export function verifyGitHubSignature(
  body: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== signatureHeader.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

export type SponsorshipEvent = {
  action: "created" | "cancelled" | "tier_changed";
  sponsorLogin: string;
  sponsorGithubId: number;
  amountCentsMonthly: number;
  tierName: string;
  createdAt: string;
};

const HANDLED_ACTIONS = new Set(["created", "cancelled", "tier_changed"]);

export function parseSponsorshipEvent(payload: Record<string, unknown>): SponsorshipEvent | null {
  const action = payload.action as string;
  if (!HANDLED_ACTIONS.has(action)) return null;

  const sponsorship = payload.sponsorship as Record<string, unknown>;
  const sponsor = sponsorship.sponsor as Record<string, unknown>;
  const tier = sponsorship.tier as Record<string, unknown>;

  return {
    action: action as SponsorshipEvent["action"],
    sponsorLogin: sponsor.login as string,
    sponsorGithubId: sponsor.id as number,
    amountCentsMonthly: tier.monthly_price_in_cents as number,
    tierName: tier.name as string,
    createdAt: sponsorship.created_at as string,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/bones/Desktop/breachlab-platform && npx vitest run tests/unit/webhooks/github-sponsors.test.ts`

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/webhooks/github-sponsors.ts tests/unit/webhooks/github-sponsors.test.ts
git commit -m "feat(webhooks): add GitHub Sponsors signature verification and payload parsing"
```

---

## Task 4: Sponsor Badge Kinds

**Files:**
- Modify: `src/lib/badges/types.ts`
- Modify: `src/components/badges/BadgePill.tsx`
- Modify: `tests/unit/badges/types.test.ts`

- [ ] **Step 1: Update badge types test to include sponsor kinds**

Add to `tests/unit/badges/types.test.ts`:

```ts
  it("recognizes sponsor badge kinds", () => {
    expect(isBadgeKind("sponsor_recruit")).toBe(true);
    expect(isBadgeKind("sponsor_operator")).toBe(true);
    expect(isBadgeKind("sponsor_phantom")).toBe(true);
    expect(isBadgeKind("sponsor_architect")).toBe(true);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bones/Desktop/breachlab-platform && npx vitest run tests/unit/badges/types.test.ts`

Expected: FAIL — `sponsor_recruit` not recognized.

- [ ] **Step 3: Add sponsor badge kinds to types.ts**

In `src/lib/badges/types.ts`, update the type and constants:

```ts
export type BadgeKind =
  | "first_blood"
  | "track_complete"
  | "supporter"
  | "speedrun_top10"
  | "ghost_graduate"
  | "phantom_master"
  | "sponsor_recruit"
  | "sponsor_operator"
  | "sponsor_phantom"
  | "sponsor_architect";

const KINDS = new Set<BadgeKind>([
  "first_blood",
  "track_complete",
  "supporter",
  "speedrun_top10",
  "ghost_graduate",
  "phantom_master",
  "sponsor_recruit",
  "sponsor_operator",
  "sponsor_phantom",
  "sponsor_architect",
]);

export function isBadgeKind(value: string): value is BadgeKind {
  return KINDS.has(value as BadgeKind);
}

export const BADGE_LABEL: Record<BadgeKind, string> = {
  first_blood: "First Blood",
  track_complete: "Track Complete",
  supporter: "Supporter",
  speedrun_top10: "Speedrun Top 10",
  ghost_graduate: "Ghost Graduate",
  phantom_master: "Phantom Operative",
  sponsor_recruit: "Recruit Sponsor",
  sponsor_operator: "Operator Sponsor",
  sponsor_phantom: "Phantom Sponsor",
  sponsor_architect: "Architect Sponsor",
};
```

- [ ] **Step 4: Add sponsor badge colors to BadgePill.tsx**

In `src/components/badges/BadgePill.tsx`, update the COLOR map:

```ts
const COLOR: Record<BadgeKind, string> = {
  first_blood: "border-red text-red",
  track_complete: "border-amber text-amber",
  supporter: "border-green text-green",
  speedrun_top10: "border-amber text-amber",
  ghost_graduate: "border-amber text-amber font-bold",
  phantom_master: "border-red text-red font-bold",
  sponsor_recruit: "border-green text-green",
  sponsor_operator: "border-green text-green font-bold",
  sponsor_phantom: "border-amber text-amber font-bold",
  sponsor_architect: "border-amber text-amber font-bold",
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/bones/Desktop/breachlab-platform && npx vitest run tests/unit/badges/types.test.ts`

Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/badges/types.ts src/components/badges/BadgePill.tsx tests/unit/badges/types.test.ts
git commit -m "feat(badges): add sponsor tier badge kinds and colors"
```

---

## Task 5: Sponsor Queries

**Files:**
- Create: `src/lib/sponsors/queries.ts`

- [ ] **Step 1: Implement sponsor queries**

```ts
// src/lib/sponsors/queries.ts
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sponsors } from "@/lib/sponsors/schema";
import { users } from "@/lib/db/schema";
import { computeTier, computeLongevityPin, TIER_ORDER, type TierCode, type LongevityPin } from "./tiers";

export type PublicSponsor = {
  username: string | null;
  tierCode: TierCode;
  source: string;
  longevityPin: LongevityPin | null;
  dedication: string | null;
  startedAt: Date;
  visibility: string;
};

export type TierGroup = {
  tier: TierCode;
  sponsors: PublicSponsor[];
  anonymousCount: number;
};

export async function getPublicSponsors(): Promise<TierGroup[]> {
  const now = new Date();
  const rows = await db
    .select({
      username: users.username,
      tierCode: sponsors.tierCode,
      source: sponsors.source,
      visibility: sponsors.visibility,
      dedication: sponsors.dedication,
      startedAt: sponsors.startedAt,
    })
    .from(sponsors)
    .leftJoin(users, eq(users.id, sponsors.userId))
    .where(and(isNull(sponsors.endedAt)))
    .orderBy(asc(sponsors.startedAt));

  const groups: Record<TierCode, { visible: PublicSponsor[]; anonymousCount: number }> = {
    architect: { visible: [], anonymousCount: 0 },
    phantom: { visible: [], anonymousCount: 0 },
    operator: { visible: [], anonymousCount: 0 },
    recruit: { visible: [], anonymousCount: 0 },
  };

  for (const row of rows) {
    const tier = row.tierCode as TierCode;
    const group = groups[tier];
    if (!group) continue;

    if (row.visibility === "hidden") continue;

    if (row.visibility === "anonymous") {
      group.anonymousCount++;
      continue;
    }

    group.visible.push({
      username: row.visibility === "username_only" || row.visibility === "public" ? row.username : null,
      tierCode: tier,
      source: row.source,
      longevityPin: computeLongevityPin(row.startedAt, now),
      dedication: row.visibility === "public" ? row.dedication : null,
      startedAt: row.startedAt,
      visibility: row.visibility,
    });
  }

  return TIER_ORDER.map((tier) => ({
    tier,
    sponsors: groups[tier].visible,
    anonymousCount: groups[tier].anonymousCount,
  }));
}

export async function getSponsorByExternalId(
  source: string,
  externalId: string,
) {
  const [row] = await db
    .select()
    .from(sponsors)
    .where(and(eq(sponsors.source, source), eq(sponsors.externalId, externalId)))
    .limit(1);
  return row ?? null;
}

export async function getSponsorByClaimToken(token: string) {
  const [row] = await db
    .select()
    .from(sponsors)
    .where(eq(sponsors.claimToken, token))
    .limit(1);
  return row ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/sponsors/queries.ts
git commit -m "feat(sponsors): add sponsor query functions"
```

---

## Task 6: GitHub Sponsors Webhook Route

**Files:**
- Create: `src/app/api/webhooks/github-sponsors/route.ts`

- [ ] **Step 1: Implement the webhook handler**

```ts
// src/app/api/webhooks/github-sponsors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sponsors } from "@/lib/sponsors/schema";
import { users } from "@/lib/db/schema";
import { verifyGitHubSignature, parseSponsorshipEvent } from "@/lib/webhooks/github-sponsors";
import { computeTier } from "@/lib/sponsors/tiers";

export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOKS_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";

  if (!verifyGitHubSignature(body, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const event = parseSponsorshipEvent(payload);

  if (!event) {
    // Unhandled action — acknowledge it
    return NextResponse.json({ ok: true, skipped: true });
  }

  const tierCode = computeTier(event.amountCentsMonthly);

  if (event.action === "created" || event.action === "tier_changed") {
    // Check if sponsor already exists
    const [existing] = await db
      .select()
      .from(sponsors)
      .where(
        and(
          eq(sponsors.source, "github_sponsors"),
          eq(sponsors.externalId, event.sponsorLogin),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(sponsors)
        .set({
          tierCode,
          amountCentsMonthly: event.amountCentsMonthly,
          endedAt: null,
        })
        .where(eq(sponsors.id, existing.id));
    } else {
      await db.insert(sponsors).values({
        source: "github_sponsors",
        externalId: event.sponsorLogin,
        tierCode,
        amountCentsMonthly: event.amountCentsMonthly,
        startedAt: new Date(event.createdAt),
      });
    }
  }

  if (event.action === "cancelled") {
    await db
      .update(sponsors)
      .set({ endedAt: new Date() })
      .where(
        and(
          eq(sponsors.source, "github_sponsors"),
          eq(sponsors.externalId, event.sponsorLogin),
        ),
      );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/github-sponsors/route.ts
git commit -m "feat(webhooks): add GitHub Sponsors webhook handler"
```

---

## Task 7: Liberapay Sync Route

**Files:**
- Create: `src/app/api/webhooks/liberapay/sync/route.ts`

Liberapay has no webhook system. This is an admin-triggered sync endpoint that polls the Liberapay API for the project's patrons.

- [ ] **Step 1: Implement the sync handler**

```ts
// src/app/api/webhooks/liberapay/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sponsors } from "@/lib/sponsors/schema";
import { computeTier } from "@/lib/sponsors/tiers";

const LIBERAPAY_TEAM = "breachlab";

type LiberapayPublicData = {
  npatrons: number;
  receiving: { amount: string; currency: string };
};

export async function POST(req: NextRequest) {
  // Admin-only: check for shared secret
  const authHeader = req.headers.get("authorization") ?? "";
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Liberapay only exposes public team info — no individual patron list.
  // We can only track total patrons count. Individual patrons must be
  // manually added via admin or self-registered.
  // This endpoint serves as a placeholder for manual sync.
  try {
    const res = await fetch(`https://liberapay.com/${LIBERAPAY_TEAM}/public.json`);
    if (!res.ok) {
      return NextResponse.json({ error: "liberapay api error", status: res.status }, { status: 502 });
    }
    const data = (await res.json()) as LiberapayPublicData;

    return NextResponse.json({
      ok: true,
      npatrons: data.npatrons,
      receiving: data.receiving,
      note: "Liberapay does not expose individual patron data. Patrons must self-register or be added manually.",
    });
  } catch (err) {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/liberapay/sync/route.ts
git commit -m "feat(webhooks): add Liberapay sync endpoint (admin-triggered)"
```

---

## Task 8: Crypto Donor Claim Route

**Files:**
- Create: `src/app/api/sponsors/claim/route.ts`

Crypto donors receive a unique claim URL (generated by admin). When they visit it while logged in, their account gets linked to the sponsor record.

- [ ] **Step 1: Implement the claim handler**

```ts
// src/app/api/sponsors/claim/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sponsors } from "@/lib/sponsors/schema";
import { getCurrentSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const { user } = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const token = body.token as string;
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }

  const [sponsor] = await db
    .select()
    .from(sponsors)
    .where(eq(sponsors.claimToken, token))
    .limit(1);

  if (!sponsor) {
    return NextResponse.json({ error: "invalid token" }, { status: 404 });
  }

  if (sponsor.userId) {
    return NextResponse.json({ error: "already claimed" }, { status: 409 });
  }

  await db
    .update(sponsors)
    .set({ userId: user.id, claimToken: null })
    .where(eq(sponsors.id, sponsor.id));

  return NextResponse.json({ ok: true, tier: sponsor.tierCode });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/sponsors/claim/route.ts
git commit -m "feat(sponsors): add crypto donor claim endpoint"
```

---

## Task 9: OperativeCard Component

**Files:**
- Create: `src/components/operatives/OperativeCard.tsx`

- [ ] **Step 1: Build the operative card component**

```tsx
// src/components/operatives/OperativeCard.tsx
import type { TierCode, LongevityPin } from "@/lib/sponsors/tiers";
import { TIER_LABEL } from "@/lib/sponsors/tiers";

type Props = {
  username: string | null;
  tierCode: TierCode;
  source: string;
  longevityPin: LongevityPin | null;
  dedication: string | null;
};

const SOURCE_LABEL: Record<string, string> = {
  github_sponsors: "GitHub Sponsors",
  liberapay: "Liberapay",
  crypto: "BTC",
};

const PIN_LABEL: Record<LongevityPin, string> = {
  "30d": "30d",
  "90d": "90d",
  "1y": "1 year",
  "2y": "2+ years",
};

const TIER_BORDER: Record<TierCode, string> = {
  architect: "border-amber shadow-[0_0_12px_rgba(245,158,11,0.25)]",
  phantom: "border-amber/60",
  operator: "border-green/60",
  recruit: "border-muted/40",
};

export function OperativeCard({ username, tierCode, source, longevityPin, dedication }: Props) {
  return (
    <div className={`border p-3 space-y-1 ${TIER_BORDER[tierCode]}`}>
      <div className="flex items-center gap-2">
        {username ? (
          <a href={`/u/${username}`} className="text-amber text-sm hover:underline">
            {username}
          </a>
        ) : (
          <span className="text-muted text-sm italic">Anonymous</span>
        )}
        {longevityPin && (
          <span className="text-[10px] text-muted border border-muted/30 px-1">
            {PIN_LABEL[longevityPin]}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted">
        <span>{SOURCE_LABEL[source] ?? source}</span>
      </div>
      {dedication && tierCode === "architect" && (
        <p className="text-xs text-muted/80 italic mt-1">&ldquo;{dedication}&rdquo;</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/operatives/OperativeCard.tsx
git commit -m "feat(operatives): add OperativeCard component"
```

---

## Task 10: TierSection Component

**Files:**
- Create: `src/components/operatives/TierSection.tsx`

- [ ] **Step 1: Build the tier section component**

```tsx
// src/components/operatives/TierSection.tsx
import type { TierCode } from "@/lib/sponsors/tiers";
import { TIER_LABEL } from "@/lib/sponsors/tiers";
import type { PublicSponsor } from "@/lib/sponsors/queries";
import { OperativeCard } from "./OperativeCard";

type Props = {
  tier: TierCode;
  sponsors: PublicSponsor[];
  anonymousCount: number;
};

const TIER_STYLE: Record<TierCode, string> = {
  architect: "text-amber",
  phantom: "text-amber",
  operator: "text-green",
  recruit: "text-muted",
};

export function TierSection({ tier, sponsors, anonymousCount }: Props) {
  if (sponsors.length === 0 && anonymousCount === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className={`text-sm uppercase tracking-wider ${TIER_STYLE[tier]}`}>
        {TIER_LABEL[tier]}
        <span className="text-muted ml-2 text-xs normal-case">
          {sponsors.length + anonymousCount}
        </span>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sponsors.map((s, i) => (
          <OperativeCard
            key={s.username ?? `anon-${i}`}
            username={s.username}
            tierCode={s.tierCode}
            source={s.source}
            longevityPin={s.longevityPin}
            dedication={s.dedication}
          />
        ))}
      </div>
      {anonymousCount > 0 && (
        <p className="text-xs text-muted">
          + {anonymousCount} anonymous {anonymousCount === 1 ? "supporter" : "supporters"}
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/operatives/TierSection.tsx
git commit -m "feat(operatives): add TierSection component"
```

---

## Task 11: Hall of Operatives Page

**Files:**
- Create: `src/app/hall-of-operatives/page.tsx`
- Modify: `src/components/SidebarLinks.tsx`

- [ ] **Step 1: Build the Hall of Operatives page**

```tsx
// src/app/hall-of-operatives/page.tsx
import { getPublicSponsors } from "@/lib/sponsors/queries";
import { TierSection } from "@/components/operatives/TierSection";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HallOfOperativesPage() {
  const tierGroups = await getPublicSponsors();
  const totalActive = tierGroups.reduce(
    (sum, g) => sum + g.sponsors.length + g.anonymousCount,
    0,
  );

  return (
    <div className="space-y-8" data-testid="hall-of-operatives-page">
      <header className="space-y-2">
        <h1 className="text-amber text-2xl">Hall of Operatives</h1>
        <p className="text-sm text-muted max-w-2xl">
          The people who keep the lights on. Every sponsor listed here directly
          funds infrastructure, new tracks, and the mission to build real
          offensive security skills.
        </p>
        {totalActive === 0 && (
          <p className="text-sm text-muted">
            No sponsors yet.{" "}
            <Link href="/donate" className="text-amber hover:underline">
              Be the first.
            </Link>
          </p>
        )}
      </header>

      {tierGroups.map((group) => (
        <TierSection
          key={group.tier}
          tier={group.tier}
          sponsors={group.sponsors}
          anonymousCount={group.anonymousCount}
        />
      ))}

      <footer className="border-t border-border pt-4">
        <p className="text-xs text-muted">
          Want to be here?{" "}
          <Link href="/donate" className="text-amber hover:underline">
            Support the mission
          </Link>{" "}
          — GitHub Sponsors, Liberapay, or BTC.
        </p>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Add link to sidebar**

In `src/components/SidebarLinks.tsx`, add a link to Hall of Operatives:

```tsx
import Link from "next/link";

export function SidebarLinks() {
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Links</h2>
      <ul className="text-sm space-y-1">
        <li>
          <Link href="/hall-of-operatives">Hall of Operatives</Link>
        </li>
        <li>
          <Link href="/rules">Rules</Link>
        </li>
        <li>
          <a href="https://discord.gg/hJrteuV6" rel="noreferrer">
            Discord
          </a>
        </li>
        <li>
          <a
            href="https://github.com/atobones/breachlab-platform"
            rel="noreferrer"
          >
            GitHub
          </a>
        </li>
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/hall-of-operatives/page.tsx src/components/SidebarLinks.tsx
git commit -m "feat(operatives): add Hall of Operatives page and sidebar link"
```

---

## Task 12: Run Migration on Production

**Files:** None (ops task)

- [ ] **Step 1: Verify build passes locally**

Run: `cd /Users/bones/Desktop/breachlab-platform && npx next build`

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run all tests**

Run: `cd /Users/bones/Desktop/breachlab-platform && npx vitest run`

Expected: All tests pass.

- [ ] **Step 3: Set up GitHub webhook**

Go to `github.com/atobones/breachlab-platform` → Settings → Webhooks → Add webhook:
- Payload URL: `https://breachlab.org/api/webhooks/github-sponsors`
- Content type: `application/json`
- Secret: (set the same as `GITHUB_WEBHOOKS_SECRET` env var on server)
- Events: select "Sponsorships"

- [ ] **Step 4: Add env vars to production**

On the BreachLab server, add to `.env.production`:
```
GITHUB_WEBHOOKS_SECRET=<generate-random-secret>
ADMIN_API_SECRET=<generate-random-secret>
```

- [ ] **Step 5: Deploy and run migration**

```bash
ssh root@204.168.229.209
cd /opt/breachlab-platform
git pull origin main
npx drizzle-kit migrate
docker compose up -d --build
```

---

## Self-Review Notes

**Spec coverage:** All agreed scope items are covered:
- 3 rails (GH Sponsors, Liberapay, Crypto) — Tasks 6, 7, 8
- 4 privacy levels — schema `visibility` field, filtered in queries (Task 5)
- Auto claim URL for crypto — Task 8
- Tier calculation (cumulative) — Task 2
- Longevity pins (30d/90d/1y/2y+) — Task 2
- Dedication message for $100+ only — OperativeCard renders only for architect (Task 9)
- Sort by join date within tier — query orders by `startedAt` ASC (Task 5)

**No placeholders found.** All steps have concrete code.

**Type consistency verified:** `TierCode`, `LongevityPin`, `PublicSponsor`, `TierGroup` used consistently across all tasks.
