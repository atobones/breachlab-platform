import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothEvents, users } from "@/lib/db/schema";

// Phase 1 + Phase 2 inline scoring. Read all events for a round, walk
// in order, derive (user_id → totals).
//
// Phase 1 rules:
//   - crown_taken with no previous king    → actor +1 (initial claim)
//   - crown_taken displacing previous king → actor +5 (dethrone),
//                                            previous king gets
//                                            floor(hold_seconds / 60) hold pts
//   - patched (generic)                    → actor +3
//   - tutorial                             → actor +0 (not ranked)
//
// Phase 2 rules (Diamond commodity pricing + path-attributed patches):
//   - crown_taken with raw_meta.value_snapshot (path slug attribution):
//        actor receives `value_snapshot` instead of fixed +1/+5. If
//        target_user_id is set it's still a dethrone (prior king gets
//        hold pts). Initial claim with a path slug = value_snapshot.
//   - patched with raw_meta.path_patched_attributed = true → actor +5
//        (instead of +3). Set by the path_patched_attributed event
//        kind on the oracle endpoint; the kind is mapped to a row in
//        koth_events with this meta flag.
//
// Backwards-compat: events without raw_meta.value_snapshot fall back
// to Phase 1 numbers, so old rounds keep their score on rebuild.

export type ScoreRow = {
  userId: string;
  username: string;
  points: number;
  crownHolds: number;
  dethrones: number;
  patches: number;
  crownDurationSeconds: number;
};

function metaValueSnapshot(meta: unknown): number | null {
  if (!meta || typeof meta !== "object") return null;
  const v = (meta as Record<string, unknown>).value_snapshot;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function metaPathAttributed(meta: unknown): boolean {
  if (!meta || typeof meta !== "object") return false;
  return (meta as Record<string, unknown>).path_patched_attributed === true;
}

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
      rawMeta: kothEvents.rawMeta,
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

  let currentKingId: string | null = null;
  let currentKingSinceMs: number | null = null;

  function bumpActor(
    userId: string,
    username: string,
    field:
      | "points"
      | "crownHolds"
      | "dethrones"
      | "patches"
      | "crownDurationSeconds",
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
    if (username) t.username = username;
    totals.set(userId, t);
  }

  for (const ev of rows) {
    if (!ev.actorUserId || !ev.actorUsername) continue;

    if (ev.kind === "crown_taken") {
      // Hold-time award for the previous king, if any.
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

      // Phase 2: Diamond-priced reward if the event came through a
      // catalog path. Otherwise fall back to Phase 1 flat numbers.
      const snapshot = metaValueSnapshot(ev.rawMeta);
      const isDethrone = ev.targetUserId !== null;
      const reward = snapshot != null ? snapshot : isDethrone ? 5 : 1;

      bumpActor(ev.actorUserId, ev.actorUsername, "points", reward);
      bumpActor(ev.actorUserId, ev.actorUsername, "crownHolds", 1);
      if (isDethrone) {
        bumpActor(ev.actorUserId, ev.actorUsername, "dethrones", 1);
      }

      currentKingId = ev.actorUserId;
      currentKingSinceMs = ev.occurredAt.getTime();
      continue;
    }

    if (ev.kind === "patched" || ev.kind === "path_patched_attributed") {
      const attributed =
        ev.kind === "path_patched_attributed" || metaPathAttributed(ev.rawMeta);
      bumpActor(
        ev.actorUserId,
        ev.actorUsername,
        "points",
        attributed ? 5 : 3,
      );
      bumpActor(ev.actorUserId, ev.actorUsername, "patches", 1);
      continue;
    }
    // tutorial / escalated / escalation_pending / path_activated /
    // path_exploited / path_closed: no scoring delta. (path_exploited
    // and crown_taken refer to the same exploit — the points are
    // awarded on the crown_taken row via the same snapshot.)
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
