import { createHash } from "node:crypto";
import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  kothDailyAttempts,
  kothDailySeeds,
  kothEvents,
  kothPaths,
  users,
} from "@/lib/db/schema";
import { postKothDailyAnnounceToDiscord } from "@/lib/koth/discord";

// Crown Wars — Daily Shared-Seed Solo.
//
// One challenge per UTC day. Every player worldwide gets the SAME
// configuration (same path slug to crown via, same starting state)
// so times are comparable.
//
// Deterministic picker: sha256(day_utc) → index into the active
// path catalog. Two web instances generating the seed for the same
// day will land on the same pick without coordinating.
//
// Wordle/Balatro pattern: shared seed → comparable scores → DAU.

export type DailyTwistMode = "plain" | "encoded" | "riddle" | "trail";

export type DailyTwistEncoding = "base64" | "rot13" | "reverse" | "hex";

export type DailyTrailStep = {
  slug: string;
  name: string | null;
  hint: string | null;
};

// Mode-specific payload persisted in koth_daily_seeds.twist.
//   plain   → null (no twist)
//   encoded → encoding + the rendered display string
//   riddle  → human-readable riddle text describing the primitive,
//             plus optional reveal_after_sec for the hint timer
//   trail   → ordered 3-step chain (Phase 2). steps[0] mirrors the
//             seed's path_slug (backwards compat with PB / leaderboard
//             lookups). Each step's hint is only shown after the
//             prior step's crown_taken lands.
export type DailyTwist =
  | null
  | {
      mode: "encoded";
      encoding: DailyTwistEncoding;
      displayed: string;
      revealAfterSec?: number;
    }
  | {
      mode: "riddle";
      riddle: string;
      revealAfterSec?: number;
    }
  | {
      mode: "trail";
      ordered: true;
      steps: DailyTrailStep[];
    };

export type DailyChallenge = {
  dayUtc: string;              // "YYYY-MM-DD" in UTC
  pathSlug: string;
  pathName: string | null;     // human-readable from koth_paths
  pathDescription: string | null;
  pathHint: string | null;
  // Forge attribution — non-null when the path was player-submitted
  // via the Weapons Forge. NULL = house entry.
  authorUsername: string | null;
  generatedAt: Date;
  discordAnnouncedAt: Date | null;
  // Per-day puzzle variety. plain = show slug straight; encoded =
  // slug shown in some encoding; riddle = describe the primitive
  // without naming it. See generateTwist.
  twistMode: DailyTwistMode;
  twist: DailyTwist;
};

// Days since the feature shipped. Matches the formula in
// /battles/koth/daily/page.tsx and /battles/koth/page.tsx so the
// Discord embed and both pages quote the same #N for the same day.
// Today (2026-05-18) = Daily #1.
const DAILY_EPOCH = new Date("2026-05-18T00:00:00Z").getTime();
export function dailyChallengeNumber(day: string): number {
  const d = new Date(day + "T00:00:00Z").getTime();
  return Math.max(1, Math.floor((d - DAILY_EPOCH) / 86400_000) + 1);
}

export type DailyLeaderRow = {
  id: string;
  userId: string | null;
  username: string | null;
  elapsedSec: number;
  finishedAt: Date;
  selfReported: boolean;
};

// Today's UTC date in "YYYY-MM-DD" form. Anchor to UTC so the seed
// rotates at a globally-deterministic moment.
export function todayUtcString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// === Daily Twist generation =====================================

// Mode pool — relative weights, deterministic pick per day from
// sha256(day | slug). Riddle is the headline variant; encoded keeps
// the puzzle mechanical; plain is the occasional "no-twist breather";
// trail is the chain-of-3 deep-engagement mode added in Phase 2.
//
// Trail weight is intentionally lower than the single-primitive
// modes — it's a "Tuesday boss" not the default. Players who land
// it need more time + multiple SSH sessions across the day, so it
// has to be the standout, not the routine.
const TWIST_MODE_POOL: { mode: DailyTwistMode; weight: number }[] = [
  { mode: "riddle", weight: 4 },
  { mode: "encoded", weight: 4 },
  { mode: "plain", weight: 2 },
  { mode: "trail", weight: 2 },
];

const TRAIL_LENGTH = 3;

const ENCODINGS: DailyTwistEncoding[] = ["base64", "rot13", "reverse", "hex"];

function rot13(s: string): string {
  return s.replace(/[A-Za-z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

function encodeSlug(slug: string, enc: DailyTwistEncoding): string {
  switch (enc) {
    case "base64":
      return Buffer.from(slug, "utf-8").toString("base64");
    case "rot13":
      return rot13(slug);
    case "reverse":
      return slug.split("").reverse().join("");
    case "hex":
      return Buffer.from(slug, "utf-8").toString("hex");
  }
}

// Pure-function twist generator. Input: the date + slug + best
// available human-readable description + the full candidate catalog
// (needed for trail picker which must select N additional slugs
// deterministically). Output: deterministic twist payload + the mode
// that was actually selected (falls back from 'riddle' to 'encoded'
// when the path has no description we can riff on, and from 'trail'
// to 'plain' when there aren't enough catalog entries left).
type TrailCandidate = {
  slug: string;
  name: string | null;
  hint: string | null;
};

function generateTwist(
  day: string,
  slug: string,
  pathName: string | null,
  pathDescription: string | null,
  pathHint: string | null,
  candidates: TrailCandidate[] = [],
): { mode: DailyTwistMode; twist: DailyTwist } {
  const hash = createHash("sha256").update(`koth-daily-twist:${day}:${slug}`).digest();
  const totalWeight = TWIST_MODE_POOL.reduce((s, m) => s + m.weight, 0);
  let pick = hash.readUInt16BE(0) % totalWeight;
  let mode: DailyTwistMode = "plain";
  for (const m of TWIST_MODE_POOL) {
    if (pick < m.weight) {
      mode = m.mode;
      break;
    }
    pick -= m.weight;
  }

  // Riddle requires source material. If the catalog row has nothing
  // to riff on, downgrade to encoded so the player still gets a
  // puzzle and never sees an empty card.
  const riddleSource = (pathDescription ?? pathHint ?? "").trim();
  if (mode === "riddle" && riddleSource.length < 12) {
    mode = "encoded";
  }

  // Trail requires TRAIL_LENGTH-1 additional distinct candidates
  // (the primary slug becomes step 0). If the catalog is too small
  // we downgrade to riddle (the next-most-engaging single-primitive
  // mode) so a thin catalog never blocks the daily.
  if (mode === "trail") {
    const others = candidates.filter((c) => c.slug !== slug);
    if (others.length < TRAIL_LENGTH - 1) {
      mode = "riddle";
    }
  }

  if (mode === "plain") {
    return { mode, twist: null };
  }

  if (mode === "encoded") {
    const enc = ENCODINGS[hash.readUInt16BE(2) % ENCODINGS.length];
    return {
      mode,
      twist: {
        mode: "encoded",
        encoding: enc,
        displayed: encodeSlug(slug, enc),
        // After 5 min the page reveals the encoding hint inline.
        revealAfterSec: 300,
      },
    };
  }

  if (mode === "trail") {
    // Pick TRAIL_LENGTH-1 additional slugs deterministically from the
    // remaining catalog. Use a Fisher-Yates-style draw seeded by the
    // same hash so two web instances picking on the same day land on
    // the same trail. The primary slug becomes step 0.
    const pool: TrailCandidate[] = candidates
      .filter((c) => c.slug !== slug)
      .slice()
      .sort((a, b) => a.slug.localeCompare(b.slug));
    const drawn: TrailCandidate[] = [];
    let cursor = 4; // first 4 bytes are spoken for above
    for (let i = 0; i < TRAIL_LENGTH - 1 && pool.length > 0; i++) {
      // Use 2 bytes per draw; we have plenty of digest entropy.
      const off = cursor % 30;
      const idx = hash.readUInt16BE(off) % pool.length;
      drawn.push(pool[idx]);
      pool.splice(idx, 1);
      cursor += 2;
    }
    const steps: DailyTrailStep[] = [
      { slug, name: pathName, hint: (pathDescription ?? pathHint ?? null) },
      ...drawn.map((c) => ({
        slug: c.slug,
        name: c.name,
        hint: c.hint,
      })),
    ];
    return {
      mode,
      twist: { mode: "trail", ordered: true, steps },
    };
  }

  // mode === "riddle" — build a short evocative riddle. We use the
  // path's description (or hint) as the base, prefixed with a
  // flavoring stem so it reads like a clue rather than the catalog
  // entry. Pick the stem deterministically too.
  const STEMS = [
    "the king runs",
    "this primitive whispers",
    "today's crown lives in",
    "the throne is guarded by",
    "look for",
  ];
  const stem = STEMS[hash.readUInt16BE(4) % STEMS.length];
  const sanitized = riddleSource
    .replace(/\.$/, "")
    .replace(new RegExp(slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[redacted]")
    .replace(new RegExp((pathName ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&") || "____unused____", "gi"), "[redacted]");
  const riddle = `${stem} ${sanitized}.`;

  return {
    mode,
    twist: {
      mode: "riddle",
      riddle,
      revealAfterSec: 600,
    },
  };
}

// Deterministic path pick for a given UTC date. Excludes "core" kinds
// to keep daily challenges in the "escalation" tier — that's where
// player skill matters most and where breadth is highest.
async function pickPathFor(day: string): Promise<string | null> {
  const candidates = await db
    .select({ slug: kothPaths.slug })
    .from(kothPaths)
    .where(eq(kothPaths.kind, "escalation"))
    .orderBy(kothPaths.slug);
  if (candidates.length === 0) return null;
  const hash = createHash("sha256").update(`koth-daily:${day}`).digest();
  // Take the first 4 bytes as an unsigned int — plenty of entropy
  // over a multi-year horizon, no bias-risk for small N.
  const idx = hash.readUInt32BE(0) % candidates.length;
  return candidates[idx].slug;
}

// Get-or-create today's seed. On first call of the day, picks a path
// and inserts. Subsequent calls return the existing row.
//
// Also responsible for the Discord auto-announce: after the seed row
// exists, attempts to claim the `discord_announced_at` slot via a
// conditional UPDATE. Whichever request wins the claim posts the
// embed; everyone else's UPDATE matches zero rows and is a no-op.
// This gives us exactly one announce per UTC day with no external
// cron — the first page hit on the new day fires the post.
export async function getOrCreateTodaySeed(): Promise<DailyChallenge | null> {
  const day = todayUtcString();

  const fetchRow = async () => {
    const r = await db
      .select({
        dayUtc: kothDailySeeds.dayUtc,
        pathSlug: kothDailySeeds.pathSlug,
        pathName: kothPaths.name,
        pathDescription: kothPaths.description,
        pathHint: kothPaths.hint,
        authorUsername: users.username,
        generatedAt: kothDailySeeds.generatedAt,
        discordAnnouncedAt: kothDailySeeds.discordAnnouncedAt,
        twistMode: kothDailySeeds.twistMode,
        twist: kothDailySeeds.twist,
      })
      .from(kothDailySeeds)
      .leftJoin(kothPaths, eq(kothPaths.slug, kothDailySeeds.pathSlug))
      .leftJoin(users, eq(users.id, kothPaths.authorUserId))
      .where(eq(kothDailySeeds.dayUtc, day))
      .limit(1);
    return r[0] ?? null;
  };

  let row = await fetchRow();

  if (row == null) {
    const slug = await pickPathFor(day);
    if (!slug) return null;

    // Look up the full escalation catalog up front. The picked path's
    // own row gives description/hint for riddle mode; the rest of the
    // pool is what trail mode draws additional steps from. One query
    // either way — `slug` keys into the same result set.
    const catalogRows = await db
      .select({
        slug: kothPaths.slug,
        name: kothPaths.name,
        description: kothPaths.description,
        hint: kothPaths.hint,
      })
      .from(kothPaths)
      .where(eq(kothPaths.kind, "escalation"))
      .orderBy(kothPaths.slug);
    const cat = catalogRows.find((c) => c.slug === slug) ?? null;
    const { mode: twistMode, twist } = generateTwist(
      day,
      slug,
      cat?.name ?? null,
      cat?.description ?? null,
      cat?.hint ?? null,
      catalogRows.map((c) => ({
        slug: c.slug,
        name: c.name,
        hint: c.hint,
      })),
    );

    // Race-safe insert: another request might be doing the same right
    // now. ON CONFLICT DO NOTHING + re-read.
    await db
      .insert(kothDailySeeds)
      .values({ dayUtc: day, pathSlug: slug, twistMode, twist })
      .onConflictDoNothing({ target: kothDailySeeds.dayUtc });

    row = await fetchRow();
    if (row == null) return null;
  }

  // Backfill twist on legacy rows that pre-date migration 0030 —
  // they have twist_mode = 'plain' (default) and NULL twist. If a
  // row's twist_mode is still default *and* the day is today, run
  // the generator and persist. Older days stay plain to preserve
  // history.
  if (row.twistMode === "plain" && row.twist == null && row.dayUtc === day) {
    const { mode: twistMode, twist } = generateTwist(
      day,
      row.pathSlug,
      row.pathName,
      row.pathDescription,
      row.pathHint,
    );
    if (twistMode !== "plain") {
      await db
        .update(kothDailySeeds)
        .set({ twistMode, twist })
        .where(eq(kothDailySeeds.dayUtc, day));
      row.twistMode = twistMode;
      row.twist = twist as typeof row.twist;
    }
  }

  // Try to claim the Discord-announce slot. The UPDATE only matches
  // when discord_announced_at is still NULL, so concurrent callers
  // produce at most one "I won" result. The winner fires the embed.
  if (row.discordAnnouncedAt == null) {
    const claim = await db
      .update(kothDailySeeds)
      .set({ discordAnnouncedAt: new Date() })
      .where(
        and(
          eq(kothDailySeeds.dayUtc, day),
          isNull(kothDailySeeds.discordAnnouncedAt),
        ),
      )
      .returning({ dayUtc: kothDailySeeds.dayUtc });
    if (claim.length === 1) {
      // Fire-and-forget. Discord-side failure must not block the page
      // render, and the announce is already considered "delivered"
      // from a state-machine standpoint (we won't try again).
      try {
        postKothDailyAnnounceToDiscord({
          dayUtc: day,
          challengeNumber: dailyChallengeNumber(day),
          pathName: row.pathName,
          pathSlug: row.pathSlug,
          authorUsername: row.authorUsername,
        });
      } catch {
        // best-effort
      }
      row.discordAnnouncedAt = new Date();
    }
  }

  // Narrow jsonb (Drizzle returns it as unknown) + twistMode (text)
  // into our domain types. CHECK constraint in migration 0030
  // guarantees twist_mode is one of the three legal values.
  return {
    ...row,
    twistMode: row.twistMode as DailyTwistMode,
    twist: (row.twist as DailyTwist) ?? null,
  };
}

// One-attempt-per-user-per-day. Returns the existing row if the user
// already started today; otherwise creates one.
export async function startDailyAttempt(
  day: string,
  userId: string | null,
): Promise<{ id: string; startedAt: Date; resumed: boolean }> {
  if (userId != null) {
    // Already started today?
    const existing = await db
      .select({ id: kothDailyAttempts.id, startedAt: kothDailyAttempts.startedAt })
      .from(kothDailyAttempts)
      .where(
        and(
          eq(kothDailyAttempts.dayUtc, day),
          eq(kothDailyAttempts.userId, userId),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      return { ...existing[0], resumed: true };
    }
  }
  const [row] = await db
    .insert(kothDailyAttempts)
    .values({
      dayUtc: day,
      userId,
      selfReported: userId == null,
    })
    .returning({
      id: kothDailyAttempts.id,
      startedAt: kothDailyAttempts.startedAt,
    });
  return { ...row, resumed: false };
}

// Return the user's attempt for the given day, if any. Used by the
// daily page to render the right phase on load — racing if there's
// an unfinished attempt, finished if there's a completed one, ready
// otherwise.
export async function getDailyAttemptForUser(
  userId: string,
  day: string,
) {
  const r = await db
    .select()
    .from(kothDailyAttempts)
    .where(
      and(
        eq(kothDailyAttempts.dayUtc, day),
        eq(kothDailyAttempts.userId, userId),
      ),
    )
    .limit(1);
  return r[0] ?? null;
}

export async function getDailyAttempt(id: string) {
  const r = await db
    .select()
    .from(kothDailyAttempts)
    .where(eq(kothDailyAttempts.id, id))
    .limit(1);
  return r[0] ?? null;
}

// Strict-verify finish — only marks the attempt as crowned when there
// is an actual crown_taken event in the round, by this user, AFTER
// the attempt started, AND via the exact path slug today's seed
// names. No honor-system fallback: clicking finish without a real
// in-arena crown leaves the attempt unfinished.
//
// Behaviour matrix:
//   - already finished → idempotent: return the persisted result
//   - unfinished, no matching event → leave unfinished, return
//     { verified: false } so the UI can keep the timer running
//   - unfinished, matching event → flip finished, write elapsed +
//     linked_event_id, return { verified: true, ... }
export type FinishOutcome =
  | {
      verified: true;
      elapsedSec: number;
      tookCrown: true;
      linkedEventId: number;
    }
  | { verified: false; reason: "not_crowned_yet" | "no_user" | "no_seed" };

export async function finishDailyAttempt(
  attemptId: string,
): Promise<FinishOutcome | null> {
  const existing = await db
    .select()
    .from(kothDailyAttempts)
    .where(eq(kothDailyAttempts.id, attemptId))
    .limit(1);
  if (existing.length === 0) return null;
  const a = existing[0];
  if (a.finishedAt != null) {
    // Already finished — replay the stored result.
    if (a.tookCrown && a.linkedEventId != null) {
      return {
        verified: true,
        elapsedSec: a.elapsedSec ?? 0,
        tookCrown: true,
        linkedEventId: a.linkedEventId,
      };
    }
    return { verified: false, reason: "not_crowned_yet" };
  }
  if (a.userId == null) {
    return { verified: false, reason: "no_user" };
  }

  // Resolve today's seed — verification keys off this. If the seed
  // row is gone (catalog tear-down), we can't verify so we punt.
  const seedRow = await db
    .select({
      pathSlug: kothDailySeeds.pathSlug,
      twistMode: kothDailySeeds.twistMode,
      twist: kothDailySeeds.twist,
    })
    .from(kothDailySeeds)
    .where(eq(kothDailySeeds.dayUtc, a.dayUtc))
    .limit(1);
  if (seedRow.length === 0) {
    return { verified: false, reason: "no_seed" };
  }
  const seed = seedRow[0];

  // Trail mode (Phase 2) — must complete every step in order. We
  // poll for crown_taken events for step 0..N-1; "current step" is
  // the first step not yet in steps_completed. Each step that lands
  // gets persisted incrementally so partial progress survives a
  // page reload. Attempt completes only when ALL steps are done.
  if (seed.twistMode === "trail") {
    const twist = seed.twist as DailyTwist;
    if (!twist || twist.mode !== "trail") {
      return { verified: false, reason: "no_seed" };
    }
    const completedSoFar = Array.isArray(a.stepsCompleted)
      ? (a.stepsCompleted as string[])
      : [];
    const completedSet = new Set(completedSoFar);
    const newlyCompleted: string[] = [];
    let lastEventId: number | null = a.linkedEventId;
    let lastEventAt: Date | null = null;

    for (const step of twist.steps) {
      if (completedSet.has(step.slug)) continue;
      // Ordered chain: stop scanning at first unmet step. Step N
      // can't be credited if step N-1 isn't done yet.
      const stepEvt = await db
        .select({ id: kothEvents.id, occurredAt: kothEvents.occurredAt })
        .from(kothEvents)
        .where(
          and(
            eq(kothEvents.actorUserId, a.userId),
            eq(kothEvents.kind, "crown_taken"),
            eq(kothEvents.exploitPath, step.slug),
            gt(kothEvents.occurredAt, a.startedAt),
          ),
        )
        .orderBy(kothEvents.occurredAt)
        .limit(1);
      if (stepEvt.length === 0) {
        break;
      }
      newlyCompleted.push(step.slug);
      completedSet.add(step.slug);
      lastEventId = stepEvt[0].id;
      lastEventAt = stepEvt[0].occurredAt;
    }

    const allDone =
      twist.steps.every((s) => completedSet.has(s.slug)) &&
      twist.steps.length > 0;

    if (newlyCompleted.length > 0 && !allDone) {
      // Partial progress — persist steps_completed but leave the
      // attempt unfinished so the player keeps the running clock.
      await db
        .update(kothDailyAttempts)
        .set({ stepsCompleted: [...completedSet] })
        .where(eq(kothDailyAttempts.id, attemptId));
      return { verified: false, reason: "not_crowned_yet" };
    }

    if (allDone && lastEventAt) {
      const finishedAt = lastEventAt;
      const elapsedSec = Math.max(
        0,
        Math.round((finishedAt.getTime() - a.startedAt.getTime()) / 1000),
      );
      await db
        .update(kothDailyAttempts)
        .set({
          finishedAt,
          elapsedSec,
          tookCrown: true,
          linkedEventId: lastEventId,
          stepsCompleted: [...completedSet],
        })
        .where(eq(kothDailyAttempts.id, attemptId));
      return {
        verified: true,
        elapsedSec,
        tookCrown: true,
        linkedEventId: lastEventId ?? 0,
      };
    }

    return { verified: false, reason: "not_crowned_yet" };
  }

  // Single-primitive mode (plain / encoded / riddle) — verify one
  // crown_taken event for the seed's path_slug.
  const requiredSlug = seed.pathSlug;
  const evt = await db
    .select({ id: kothEvents.id, occurredAt: kothEvents.occurredAt })
    .from(kothEvents)
    .where(
      and(
        eq(kothEvents.actorUserId, a.userId),
        eq(kothEvents.kind, "crown_taken"),
        eq(kothEvents.exploitPath, requiredSlug),
        gt(kothEvents.occurredAt, a.startedAt),
      ),
    )
    .orderBy(kothEvents.occurredAt)
    .limit(1);
  if (evt.length === 0) {
    return { verified: false, reason: "not_crowned_yet" };
  }

  const matchedEvent = evt[0];
  const finishedAt = matchedEvent.occurredAt;
  const elapsedSec = Math.max(
    0,
    Math.round((finishedAt.getTime() - a.startedAt.getTime()) / 1000),
  );

  await db
    .update(kothDailyAttempts)
    .set({
      finishedAt,
      elapsedSec,
      tookCrown: true,
      linkedEventId: matchedEvent.id,
    })
    .where(eq(kothDailyAttempts.id, attemptId));

  return {
    verified: true,
    elapsedSec,
    tookCrown: true,
    linkedEventId: matchedEvent.id,
  };
}

// Mark an unfinished attempt as abandoned. Same shape as a normal
// finish but tookCrown=false and linked_event_id=null. Excluded from
// the leaderboard query (which filters by tookCrown=true).
export async function abandonDailyAttempt(attemptId: string): Promise<boolean> {
  const r = await db
    .update(kothDailyAttempts)
    .set({
      finishedAt: new Date(),
      tookCrown: false,
    })
    .where(
      and(
        eq(kothDailyAttempts.id, attemptId),
        sql`finished_at IS NULL`,
      ),
    )
    .returning({ id: kothDailyAttempts.id });
  return r.length > 0;
}

export async function getDailyLeaderboard(
  day: string,
  limit = 20,
): Promise<DailyLeaderRow[]> {
  const rows = await db
    .select({
      id: kothDailyAttempts.id,
      userId: kothDailyAttempts.userId,
      username: users.username,
      elapsedSec: kothDailyAttempts.elapsedSec,
      finishedAt: kothDailyAttempts.finishedAt,
      selfReported: kothDailyAttempts.selfReported,
    })
    .from(kothDailyAttempts)
    .leftJoin(users, eq(users.id, kothDailyAttempts.userId))
    .where(
      and(
        eq(kothDailyAttempts.dayUtc, day),
        eq(kothDailyAttempts.tookCrown, true),
        isNotNull(kothDailyAttempts.elapsedSec),
      ),
    )
    .orderBy(kothDailyAttempts.elapsedSec)
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    username: r.username,
    elapsedSec: r.elapsedSec ?? 0,
    finishedAt: r.finishedAt ?? new Date(0),
    selfReported: r.selfReported,
  }));
}

// Per-user streak across consecutive UTC days. Used for the "▸ N-day
// streak" badge on the user's profile and as a habit-loop primitive.
export async function getDailyStreak(userId: string): Promise<number> {
  const rows = await db
    .select({ day: kothDailyAttempts.dayUtc })
    .from(kothDailyAttempts)
    .where(
      and(
        eq(kothDailyAttempts.userId, userId),
        eq(kothDailyAttempts.tookCrown, true),
      ),
    )
    .orderBy(desc(kothDailyAttempts.dayUtc));
  if (rows.length === 0) return 0;
  // Walk back day by day from the most recent successful day; stop
  // when a gap appears.
  let streak = 1;
  let prev = new Date(rows[0].day + "T00:00:00Z");
  for (let i = 1; i < rows.length; i++) {
    const cur = new Date(rows[i].day + "T00:00:00Z");
    const gapDays = (prev.getTime() - cur.getTime()) / 86400_000;
    if (gapDays === 1) {
      streak += 1;
      prev = cur;
    } else {
      break;
    }
  }
  return streak;
}

// Personal best for the given user on the given primitive (across
// every daily that has shown this slug). Returns null when the user
// has never crowned via this primitive before — page should render
// "first time on this primitive" copy in that case.
export async function getPersonalBestForPrimitive(
  userId: string,
  pathSlug: string,
): Promise<{ elapsedSec: number; dayUtc: string } | null> {
  const rows = await db
    .select({
      elapsedSec: kothDailyAttempts.elapsedSec,
      dayUtc: kothDailyAttempts.dayUtc,
    })
    .from(kothDailyAttempts)
    .innerJoin(
      kothDailySeeds,
      eq(kothDailySeeds.dayUtc, kothDailyAttempts.dayUtc),
    )
    .where(
      and(
        eq(kothDailyAttempts.userId, userId),
        eq(kothDailyAttempts.tookCrown, true),
        isNotNull(kothDailyAttempts.elapsedSec),
        eq(kothDailySeeds.pathSlug, pathSlug),
      ),
    )
    .orderBy(kothDailyAttempts.elapsedSec)
    .limit(1);
  if (rows.length === 0) return null;
  return {
    elapsedSec: rows[0].elapsedSec ?? 0,
    dayUtc: rows[0].dayUtc,
  };
}

// Seconds until next UTC midnight — used by the page countdown.
export function secondsUntilNextSeed(now: Date = new Date()): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
}
