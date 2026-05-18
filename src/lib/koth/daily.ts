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

    // Race-safe insert: another request might be doing the same right
    // now. ON CONFLICT DO NOTHING + re-read.
    await db
      .insert(kothDailySeeds)
      .values({ dayUtc: day, pathSlug: slug })
      .onConflictDoNothing({ target: kothDailySeeds.dayUtc });

    row = await fetchRow();
    if (row == null) return null;
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

  return row;
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

export async function finishDailyAttempt(
  attemptId: string,
  opts: { tookCrown?: boolean } = {},
): Promise<{
  elapsedSec: number;
  tookCrown: boolean;
  selfReported: boolean;
  linkedEventId: number | null;
} | null> {
  const existing = await db
    .select()
    .from(kothDailyAttempts)
    .where(eq(kothDailyAttempts.id, attemptId))
    .limit(1);
  if (existing.length === 0) return null;
  const a = existing[0];
  if (a.finishedAt != null) {
    return {
      elapsedSec: a.elapsedSec ?? 0,
      tookCrown: a.tookCrown,
      selfReported: a.selfReported,
      linkedEventId: a.linkedEventId,
    };
  }

  let linkedEventId: number | null = null;
  let tookCrown = opts.tookCrown ?? false;
  if (a.userId != null) {
    const evt = await db
      .select({ id: kothEvents.id })
      .from(kothEvents)
      .where(
        and(
          eq(kothEvents.actorUserId, a.userId),
          eq(kothEvents.kind, "crown_taken"),
          gt(kothEvents.occurredAt, a.startedAt),
        ),
      )
      .orderBy(kothEvents.occurredAt)
      .limit(1);
    if (evt.length > 0) {
      linkedEventId = evt[0].id;
      tookCrown = true;
    }
  }

  const finishedAt = new Date();
  const elapsedSec = Math.max(
    0,
    Math.round((finishedAt.getTime() - a.startedAt.getTime()) / 1000),
  );

  await db
    .update(kothDailyAttempts)
    .set({
      finishedAt,
      elapsedSec,
      tookCrown,
      linkedEventId,
    })
    .where(eq(kothDailyAttempts.id, attemptId));

  return {
    elapsedSec,
    tookCrown,
    selfReported: a.selfReported,
    linkedEventId,
  };
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

// Seconds until next UTC midnight — used by the page countdown.
export function secondsUntilNextSeed(now: Date = new Date()): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
}
