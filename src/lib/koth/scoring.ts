import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothEvents, kothGuards, users } from "@/lib/db/schema";

// Crown Decay constants — exported so the UI can render the same
// "active vs decaying" segmentation server-side calculates.
export const DECAY_GRACE_SEC = 5 * 60; // 5 min "active" window per patch
export const DECAY_RATE = 0.3; // hold-pts/min while in decay (vs 1.0 active)
// King's Guard fraction — share of the king's active-hold seconds.
// Pure passive: claim once, scored for every king of the round.
export const GUARD_SHARE = 0.5;

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
  // Crown Decay surface — fraction of crownDurationSeconds that fell
  // outside the king's 5-minute-since-last-patch "active" window. The
  // points awarded for this slice are reduced by DECAY_RATE so AFK
  // kings can't farm hold-time on autopilot.
  crownDecaySeconds: number;
  // Guard role surface — non-zero only on the Guard's row. Tracks the
  // total active-hold seconds across every king of the round (the
  // guard scores even when the crown rotates).
  guardActiveSeconds: number;
};

// Segments a king's tenure into "active" windows (5 min after start
// + 5 min after each patch) and "decay" remainder. Returns the
// seconds in each plus the integer point award (1/min active +
// 0.3/min decay, floored).
function tenureBreakdown(
  startMs: number,
  endMs: number,
  patchTimesMs: number[],
): { activeSec: number; decaySec: number; points: number } {
  const graceMs = DECAY_GRACE_SEC * 1000;
  // Active windows: open at king start + at each patch within tenure.
  const windows: [number, number][] = [
    [startMs, Math.min(endMs, startMs + graceMs)],
  ];
  for (const t of patchTimesMs) {
    if (t < startMs || t > endMs) continue;
    windows.push([t, Math.min(endMs, t + graceMs)]);
  }
  windows.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [s, e] of windows) {
    if (merged.length && s <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(
        merged[merged.length - 1][1],
        e,
      );
    } else {
      merged.push([s, e]);
    }
  }
  const totalMs = Math.max(0, endMs - startMs);
  const activeMs = merged.reduce(
    (acc, [s, e]) => acc + Math.max(0, e - s),
    0,
  );
  const decayMs = Math.max(0, totalMs - activeMs);
  const activeSec = Math.floor(activeMs / 1000);
  const decaySec = Math.floor(decayMs / 1000);
  const ptsWeighted = activeSec + decaySec * DECAY_RATE;
  return { activeSec, decaySec, points: Math.floor(ptsWeighted / 60) };
}

// Helper: read the guard for a round, if any. Used by topNForRound.
async function guardForRound(roundId: string): Promise<string | null> {
  const r = await db
    .select({ userId: kothGuards.userId })
    .from(kothGuards)
    .where(eq(kothGuards.roundId, roundId))
    .limit(1);
  return r[0]?.userId ?? null;
}

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

  const guardId = await guardForRound(roundId);

  const totals = new Map<
    string,
    {
      username: string;
      points: number;
      crownHolds: number;
      dethrones: number;
      patches: number;
      crownDurationSeconds: number;
      crownDecaySeconds: number;
      guardActiveSeconds: number;
    }
  >();

  let currentKingId: string | null = null;
  let currentKingUsername: string | null = null;
  let currentKingSinceMs: number | null = null;
  // Per-tenure patch timestamps, reset whenever the king changes.
  let currentKingPatches: number[] = [];

  function bumpActor(
    userId: string,
    username: string,
    field:
      | "points"
      | "crownHolds"
      | "dethrones"
      | "patches"
      | "crownDurationSeconds"
      | "crownDecaySeconds"
      | "guardActiveSeconds",
    delta: number,
  ) {
    const t = totals.get(userId) ?? {
      username,
      points: 0,
      crownHolds: 0,
      dethrones: 0,
      patches: 0,
      crownDurationSeconds: 0,
      crownDecaySeconds: 0,
      guardActiveSeconds: 0,
    };
    t[field] += delta;
    if (username) t.username = username;
    totals.set(userId, t);
  }

  // Close out the running king's tenure at endMs, awarding their
  // hold points with decay segmentation + the guard's share.
  function closeKingTenure(endMs: number) {
    if (currentKingId == null || currentKingSinceMs == null) return;
    const breakdown = tenureBreakdown(
      currentKingSinceMs,
      endMs,
      currentKingPatches,
    );
    const totalSec = breakdown.activeSec + breakdown.decaySec;
    bumpActor(
      currentKingId,
      currentKingUsername ?? "",
      "crownDurationSeconds",
      totalSec,
    );
    bumpActor(
      currentKingId,
      currentKingUsername ?? "",
      "crownDecaySeconds",
      breakdown.decaySec,
    );
    bumpActor(
      currentKingId,
      currentKingUsername ?? "",
      "points",
      breakdown.points,
    );
    // Guard scoring: half of the active-hold seconds (rounded to
    // whole points) per king of the round. Decay-time doesn't earn
    // anything for the guard either — keeps incentives aligned.
    if (guardId && guardId !== currentKingId) {
      bumpActor(guardId, "", "guardActiveSeconds", breakdown.activeSec);
      bumpActor(
        guardId,
        "",
        "points",
        Math.floor((breakdown.activeSec * GUARD_SHARE) / 60),
      );
    }
  }

  for (const ev of rows) {
    if (!ev.actorUserId || !ev.actorUsername) continue;

    if (ev.kind === "crown_taken") {
      // Close out the previous king's tenure at this transition.
      if (currentKingId && currentKingId !== ev.actorUserId) {
        closeKingTenure(ev.occurredAt.getTime());
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

      // Reset tenure tracking for the incoming king.
      currentKingId = ev.actorUserId;
      currentKingUsername = ev.actorUsername;
      currentKingSinceMs = ev.occurredAt.getTime();
      currentKingPatches = [];
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
      // If the patcher IS the current king, this event refreshes
      // their "active" window in the decay calculation.
      if (ev.actorUserId === currentKingId) {
        currentKingPatches.push(ev.occurredAt.getTime());
      }
      continue;
    }
    // tutorial / escalated / escalation_pending / path_activated /
    // path_exploited / path_closed: no scoring delta. (path_exploited
    // and crown_taken refer to the same exploit — the points are
    // awarded on the crown_taken row via the same snapshot.)
  }

  // Final partial hold credit for the still-active king up to now.
  if (currentKingId && currentKingSinceMs !== null) {
    closeKingTenure(Date.now());
  }

  // Ensure guard row exists even if they scored 0 (so the UI can
  // surface the role badge regardless).
  if (guardId && !totals.has(guardId)) {
    const r = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, guardId))
      .limit(1);
    if (r[0]?.username) {
      totals.set(guardId, {
        username: r[0].username,
        points: 0,
        crownHolds: 0,
        dethrones: 0,
        patches: 0,
        crownDurationSeconds: 0,
        crownDecaySeconds: 0,
        guardActiveSeconds: 0,
      });
    }
  }

  return Array.from(totals.entries())
    .map(([userId, t]) => ({ userId, ...t }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}
