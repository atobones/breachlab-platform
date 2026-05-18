import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  kothEvents,
  kothRaceAttempts,
  kothReplays,
  users,
} from "@/lib/db/schema";

// Ghost-race race-attempts query layer.
//
// Honor-system fallback: if the player isn't a platform user (no
// session cookie, fresh visitor racing a public ghost), we still
// record an anonymous attempt with self_reported=true. The legitimate
// timing requires a koth_events.crown_taken match within the race
// window — anonymous attempts skip that check (no user_id to match
// against) and rely on the player's own click of "I took the crown".

export type LeaderboardRow = {
  id: string;
  userId: string | null;
  username: string | null;
  elapsedSec: number;
  finishedAt: Date;
  selfReported: boolean;
};

export async function startRaceAttempt(
  replayId: string,
  userId: string | null,
): Promise<{ id: string; startedAt: Date }> {
  const [row] = await db
    .insert(kothRaceAttempts)
    .values({
      replayId,
      userId,
      selfReported: userId == null,
    })
    .returning({
      id: kothRaceAttempts.id,
      startedAt: kothRaceAttempts.startedAt,
    });
  return row;
}

// Finish a race attempt. Two paths:
//   1. user_id is set + we find a matching crown_taken event after
//      started_at → genuine win, link the event_id.
//   2. user_id is null (anonymous) OR no matching event → honor-system
//      finish, took_crown=true based on the caller's claim.
//
// Either way, finished_at = now() and elapsed_sec is computed.
export async function finishRaceAttempt(
  attemptId: string,
  opts: { tookCrown?: boolean } = {},
): Promise<{
  elapsedSec: number;
  tookCrown: boolean;
  selfReported: boolean;
  linkedEventId: number | null;
} | null> {
  // Load the attempt + check it's not already finished.
  const existing = await db
    .select()
    .from(kothRaceAttempts)
    .where(eq(kothRaceAttempts.id, attemptId))
    .limit(1);
  if (existing.length === 0) return null;
  const attempt = existing[0];
  if (attempt.finishedAt != null) {
    // Already finished — return the persisted values rather than
    // double-counting.
    return {
      elapsedSec: attempt.elapsedSec ?? 0,
      tookCrown: attempt.tookCrown,
      selfReported: attempt.selfReported,
      linkedEventId: attempt.linkedEventId,
    };
  }

  // Try to find a genuine crown_taken event for this user since
  // started_at. We accept any crown_taken — the player chose to start
  // this race; if they took crown afterwards in any round, they win.
  let linkedEventId: number | null = null;
  let tookCrown = opts.tookCrown ?? false;
  if (attempt.userId != null) {
    const evt = await db
      .select({ id: kothEvents.id })
      .from(kothEvents)
      .where(
        and(
          eq(kothEvents.actorUserId, attempt.userId),
          eq(kothEvents.kind, "crown_taken"),
          gt(kothEvents.occurredAt, attempt.startedAt),
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
  const elapsedMs = finishedAt.getTime() - attempt.startedAt.getTime();
  const elapsedSec = Math.max(0, Math.round(elapsedMs / 1000));

  await db
    .update(kothRaceAttempts)
    .set({
      finishedAt,
      elapsedSec,
      tookCrown,
      linkedEventId,
    })
    .where(eq(kothRaceAttempts.id, attemptId));

  return {
    elapsedSec,
    tookCrown,
    selfReported: attempt.selfReported,
    linkedEventId,
  };
}

export async function getRaceAttempt(id: string) {
  const rows = await db
    .select()
    .from(kothRaceAttempts)
    .where(eq(kothRaceAttempts.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getReplayLeaderboard(
  replayId: string,
  limit = 20,
): Promise<LeaderboardRow[]> {
  const rows = await db
    .select({
      id: kothRaceAttempts.id,
      userId: kothRaceAttempts.userId,
      username: users.username,
      elapsedSec: kothRaceAttempts.elapsedSec,
      finishedAt: kothRaceAttempts.finishedAt,
      selfReported: kothRaceAttempts.selfReported,
    })
    .from(kothRaceAttempts)
    .leftJoin(users, eq(users.id, kothRaceAttempts.userId))
    .where(
      and(
        eq(kothRaceAttempts.replayId, replayId),
        eq(kothRaceAttempts.tookCrown, true),
        isNotNull(kothRaceAttempts.elapsedSec),
      ),
    )
    .orderBy(kothRaceAttempts.elapsedSec)
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

// Ghost duration — used for showing "you vs ghost" diff. Fall back to
// 0 if not recorded (some casts don't have duration_sec until probed).
export async function getReplayGhostDuration(
  replayId: string,
): Promise<number> {
  const rows = await db
    .select({ d: kothReplays.durationSec })
    .from(kothReplays)
    .where(eq(kothReplays.id, replayId))
    .limit(1);
  return rows[0]?.d ?? 0;
}

// Cleanup helper for the cron sweep — abandons race attempts that
// have been open longer than 1 hour (CHECK constraint upper bound).
export async function reapStaleAttempts(): Promise<number> {
  const r = await db
    .update(kothRaceAttempts)
    .set({
      finishedAt: sql`now()`,
      elapsedSec: 3600,
      tookCrown: false,
    })
    .where(
      and(
        isNull(kothRaceAttempts.finishedAt),
        sql`${kothRaceAttempts.startedAt} < now() - interval '1 hour'`,
      ),
    )
    .returning({ id: kothRaceAttempts.id });
  return r.length;
}
