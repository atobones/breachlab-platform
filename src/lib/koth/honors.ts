import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothEvents, kothHonors } from "@/lib/db/schema";
import { topNForRound } from "./scoring";

// KoTH Honors — permanent operator records.
//
// Round wins are awarded when a round closes. Lifetime counters
// (crowns / dethrones) are computed from koth_events on demand so the
// numbers stay correct without periodic recompute. First-time
// milestones (first_crown, first_dethrone, first_path_kill) are
// awarded by the oracle event handler at the moment they happen.

export type LifetimeStats = {
  crowns: number; // every successful crown_taken
  dethrones: number; // crown_taken with a target (displacement)
  roundWins: number; // koth_honors rows of kind=round_winner
};

export async function getLifetimeStats(
  userId: string,
): Promise<LifetimeStats> {
  // Two cheap aggregations + one row count. All indexed.
  const [crownsRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(kothEvents)
    .where(
      and(
        eq(kothEvents.kind, "crown_taken"),
        eq(kothEvents.actorUserId, userId),
      ),
    );
  const [dethronesRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(kothEvents)
    .where(
      and(
        eq(kothEvents.kind, "crown_taken"),
        eq(kothEvents.actorUserId, userId),
        isNotNull(kothEvents.targetUserId),
      ),
    );
  const [winsRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(kothHonors)
    .where(
      and(eq(kothHonors.userId, userId), eq(kothHonors.kind, "round_winner")),
    );
  return {
    crowns: crownsRow?.c ?? 0,
    dethrones: dethronesRow?.c ?? 0,
    roundWins: winsRow?.c ?? 0,
  };
}

// Batch version — fetches stats for many users in three round-trips.
// Used by the leaderboard row renderer.
export async function getLifetimeStatsForUsers(
  userIds: string[],
): Promise<Map<string, LifetimeStats>> {
  const out = new Map<string, LifetimeStats>();
  if (userIds.length === 0) return out;
  for (const id of userIds) {
    out.set(id, { crowns: 0, dethrones: 0, roundWins: 0 });
  }
  const crowns = await db
    .select({
      userId: kothEvents.actorUserId,
      c: sql<number>`count(*)::int`,
    })
    .from(kothEvents)
    .where(
      and(
        eq(kothEvents.kind, "crown_taken"),
        sql`${kothEvents.actorUserId} = ANY(${userIds})`,
      ),
    )
    .groupBy(kothEvents.actorUserId);
  for (const r of crowns) {
    if (r.userId) {
      const s = out.get(r.userId);
      if (s) s.crowns = r.c;
    }
  }
  const dethrones = await db
    .select({
      userId: kothEvents.actorUserId,
      c: sql<number>`count(*)::int`,
    })
    .from(kothEvents)
    .where(
      and(
        eq(kothEvents.kind, "crown_taken"),
        isNotNull(kothEvents.targetUserId),
        sql`${kothEvents.actorUserId} = ANY(${userIds})`,
      ),
    )
    .groupBy(kothEvents.actorUserId);
  for (const r of dethrones) {
    if (r.userId) {
      const s = out.get(r.userId);
      if (s) s.dethrones = r.c;
    }
  }
  const wins = await db
    .select({
      userId: kothHonors.userId,
      c: sql<number>`count(*)::int`,
    })
    .from(kothHonors)
    .where(
      and(
        eq(kothHonors.kind, "round_winner"),
        sql`${kothHonors.userId} = ANY(${userIds})`,
      ),
    )
    .groupBy(kothHonors.userId);
  for (const r of wins) {
    const s = out.get(r.userId);
    if (s) s.roundWins = r.c;
  }
  return out;
}

// Award the round-winner honor for a freshly-closed round. Idempotent
// — the unique-partial index on (round_id) where kind='round_winner'
// guards against double-award if the close endpoint is replayed.
// Returns the winner row info for the caller to broadcast (Discord).
export async function awardRoundWinner(roundId: string): Promise<{
  userId: string;
  username: string;
  points: number;
  dethrones: number;
  crownHolds: number;
  crownDurationSeconds: number;
} | null> {
  const top = await topNForRound(roundId, 1);
  const winner = top[0];
  if (!winner || winner.points <= 0) return null;
  try {
    await db.insert(kothHonors).values({
      userId: winner.userId,
      roundId,
      kind: "round_winner",
      metadata: {
        points: winner.points,
        crown_holds: winner.crownHolds,
        dethrones: winner.dethrones,
        crown_duration_seconds: winner.crownDurationSeconds,
      },
    });
  } catch {
    // Unique-index collision = winner already awarded. Treat as success.
  }
  return {
    userId: winner.userId,
    username: winner.username,
    points: winner.points,
    dethrones: winner.dethrones,
    crownHolds: winner.crownHolds,
    crownDurationSeconds: winner.crownDurationSeconds,
  };
}

// Fire-and-forget award of a first-time milestone honor. The oracle
// event handler calls this for first-crown / first-dethrone / first-
// path-kill at the moment the event happens. We pre-check existence
// to avoid table noise (would still be idempotent via the caller's
// flow but the row write is wasted).
export async function maybeAwardFirstTime(opts: {
  userId: string;
  kind: "first_crown" | "first_dethrone" | "first_path_kill";
  roundId: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  // For first_path_kill we key on (user, path_slug) inside metadata;
  // for the others just (user, kind). Cheap existence probe.
  if (opts.kind === "first_path_kill") {
    const slug = (opts.metadata?.path_slug as string | undefined) ?? null;
    if (!slug) return false;
    const [hit] = await db
      .select({ id: kothHonors.id })
      .from(kothHonors)
      .where(
        and(
          eq(kothHonors.userId, opts.userId),
          eq(kothHonors.kind, "first_path_kill"),
          sql`${kothHonors.metadata} ->> 'path_slug' = ${slug}`,
        ),
      )
      .limit(1);
    if (hit) return false;
  } else {
    const [hit] = await db
      .select({ id: kothHonors.id })
      .from(kothHonors)
      .where(
        and(eq(kothHonors.userId, opts.userId), eq(kothHonors.kind, opts.kind)),
      )
      .limit(1);
    if (hit) return false;
  }
  try {
    await db.insert(kothHonors).values({
      userId: opts.userId,
      roundId: opts.roundId,
      kind: opts.kind,
      metadata: opts.metadata ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

// Most recent N round wins for a user, used on profile / hover cards.
export async function recentRoundWins(
  userId: string,
  limit: number,
): Promise<
  Array<{ id: string; roundId: string | null; awardedAt: Date; metadata: unknown }>
> {
  const rows = await db
    .select({
      id: kothHonors.id,
      roundId: kothHonors.roundId,
      awardedAt: kothHonors.awardedAt,
      metadata: kothHonors.metadata,
    })
    .from(kothHonors)
    .where(
      and(eq(kothHonors.userId, userId), eq(kothHonors.kind, "round_winner")),
    )
    .orderBy(desc(kothHonors.awardedAt))
    .limit(limit);
  return rows;
}
