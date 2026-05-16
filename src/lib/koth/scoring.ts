import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothEvents, users } from "@/lib/db/schema";

// Phase 1 inline scoring. Read all events for a round, walk in order,
// emit derived (user_id → totals). Cheap (events table is small per
// round; bounded by player count × actions/round). Wave D1 will move
// this to a 60s background job that writes koth_scores.
//
// Rules:
//   - crown_taken with target NULL    → actor +1 (initial claim)
//   - crown_taken with target non-NULL → actor +5 (dethrone),
//                                          previous king gets
//                                          floor(hold_seconds / 60) hold pts
//   - patched (with exploit_path)     → actor +3
//   - tutorial                        → actor +0 (not ranked)
//
// Returns a list sorted by points desc, truncated to `limit`.

export type ScoreRow = {
  userId: string;
  username: string;
  points: number;
  crownHolds: number;
  dethrones: number;
  patches: number;
  crownDurationSeconds: number;
};

export async function topNForRound(
  roundId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const rows = await db
    .select({
      id: kothEvents.id,
      kind: kothEvents.kind,
      actorUserId: kothEvents.actorUserId,
      targetUserId: kothEvents.targetUserId,
      occurredAt: kothEvents.occurredAt,
      actorUsername: users.username,
    })
    .from(kothEvents)
    .leftJoin(users, eq(users.id, kothEvents.actorUserId))
    .where(eq(kothEvents.roundId, roundId))
    .orderBy(asc(kothEvents.occurredAt));

  const totals = new Map<
    string,
    {
      username: string;
      points: number;
      crownHolds: number;
      dethrones: number;
      patches: number;
      crownDurationSeconds: number;
    }
  >();

  // Track the current king's user_id and the timestamp when they took
  // the crown so we can award hold points when they get dethroned.
  let currentKingId: string | null = null;
  let currentKingSinceMs: number | null = null;

  function bumpActor(
    userId: string,
    username: string,
    field: "points" | "crownHolds" | "dethrones" | "patches" | "crownDurationSeconds",
    delta: number,
  ) {
    const t = totals.get(userId) ?? {
      username,
      points: 0,
      crownHolds: 0,
      dethrones: 0,
      patches: 0,
      crownDurationSeconds: 0,
    };
    t[field] += delta;
    // Keep username fresh if we got it later (events earlier in the
    // round might have NULL actor before a key was bound).
    if (username) t.username = username;
    totals.set(userId, t);
  }

  for (const ev of rows) {
    if (!ev.actorUserId || !ev.actorUsername) continue;

    if (ev.kind === "crown_taken") {
      // Hold-time award for the previous king, if there was one and
      // it's a different user.
      if (
        currentKingId &&
        currentKingId !== ev.actorUserId &&
        currentKingSinceMs !== null
      ) {
        const holdSec = Math.max(
          0,
          Math.floor((ev.occurredAt.getTime() - currentKingSinceMs) / 1000),
        );
        bumpActor(
          currentKingId,
          totals.get(currentKingId)?.username ?? "",
          "crownDurationSeconds",
          holdSec,
        );
        bumpActor(
          currentKingId,
          totals.get(currentKingId)?.username ?? "",
          "points",
          Math.floor(holdSec / 60),
        );
      }

      // Actor: +5 dethrone if there was a previous king they're
      // displacing; otherwise +1 initial claim.
      const isDethrone = ev.targetUserId !== null;
      bumpActor(ev.actorUserId, ev.actorUsername, "points", isDethrone ? 5 : 1);
      bumpActor(ev.actorUserId, ev.actorUsername, "crownHolds", 1);
      if (isDethrone) {
        bumpActor(ev.actorUserId, ev.actorUsername, "dethrones", 1);
      }

      currentKingId = ev.actorUserId;
      currentKingSinceMs = ev.occurredAt.getTime();
      continue;
    }

    if (ev.kind === "patched") {
      bumpActor(ev.actorUserId, ev.actorUsername, "points", 3);
      bumpActor(ev.actorUserId, ev.actorUsername, "patches", 1);
      continue;
    }
    // tutorial / escalated / dethroned: no scoring delta in Phase 1.
  }

  // Final partial hold credit for the still-active king up to now.
  if (currentKingId && currentKingSinceMs !== null) {
    const holdSec = Math.max(
      0,
      Math.floor((Date.now() - currentKingSinceMs) / 1000),
    );
    bumpActor(
      currentKingId,
      totals.get(currentKingId)?.username ?? "",
      "crownDurationSeconds",
      holdSec,
    );
    bumpActor(
      currentKingId,
      totals.get(currentKingId)?.username ?? "",
      "points",
      Math.floor(holdSec / 60),
    );
  }

  return Array.from(totals.entries())
    .map(([userId, t]) => ({ userId, ...t }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}
