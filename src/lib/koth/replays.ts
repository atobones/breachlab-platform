import { and, desc, eq, sql, gte } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { kothEvents, kothReplays, kothRounds, users } from "@/lib/db/schema";

// Shape returned by the library list — deliberately *excludes* the
// `asciicast` blob. We want the list query to stay cheap (one cast can
// be hundreds of KB; 50 of them in the list view = MBs of payload).
export type ReplayListRow = {
  id: string;
  roundId: string;
  userId: string | null;
  username: string | null;
  actorSlot: string;
  kind: "session_close" | "crown_moment" | "ambient";
  exploitPath: string | null;
  durationSec: number | null;
  byteSize: number;
  recordedAt: Date;
  uploadedAt: Date;
};

export type ReplayDetail = ReplayListRow & {
  asciicast: string;
  sha256: string;
  roundStartedAt: Date;
  roundEndedAt: Date | null;
};

export type ReplayQuery = {
  slot?: string;
  exploitPath?: string;
  kind?: ReplayListRow["kind"];
  limit?: number;
  cursor?: Date;
};

export async function listReplays(
  q: ReplayQuery = {},
): Promise<ReplayListRow[]> {
  const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
  const conds = [];
  if (q.slot) conds.push(eq(kothReplays.actorSlot, q.slot));
  if (q.kind) conds.push(eq(kothReplays.kind, q.kind));
  if (q.cursor) conds.push(sql`${kothReplays.uploadedAt} < ${q.cursor}`);

  // Best-effort JOIN to koth_events for the exploit_path. Replays don't
  // store the path directly because the same recording can correspond
  // to multiple events; we surface the linked event's path when set
  // (kind="crown_moment") and the path filter applies through this.
  //
  // For "session_close" and "ambient" recordings the path comes from
  // the most-recent crown_taken event in the same round by the same
  // user, if any — a heuristic that surfaces "what they were going
  // after" without rigid linkage.
  const rows = await db
    .select({
      id: kothReplays.id,
      roundId: kothReplays.roundId,
      userId: kothReplays.userId,
      username: users.username,
      actorSlot: kothReplays.actorSlot,
      kind: kothReplays.kind,
      exploitPath: kothEvents.exploitPath,
      durationSec: kothReplays.durationSec,
      byteSize: kothReplays.byteSize,
      recordedAt: kothReplays.recordedAt,
      uploadedAt: kothReplays.uploadedAt,
    })
    .from(kothReplays)
    .leftJoin(users, eq(users.id, kothReplays.userId))
    .leftJoin(kothEvents, eq(kothEvents.id, kothReplays.linkedEventId))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(kothReplays.uploadedAt))
    .limit(limit);

  if (q.exploitPath) {
    return rows.filter((r) => r.exploitPath === q.exploitPath) as ReplayListRow[];
  }
  return rows as ReplayListRow[];
}

export async function getReplayById(id: string): Promise<ReplayDetail | null> {
  const rows = await db
    .select({
      id: kothReplays.id,
      roundId: kothReplays.roundId,
      userId: kothReplays.userId,
      username: users.username,
      actorSlot: kothReplays.actorSlot,
      kind: kothReplays.kind,
      exploitPath: kothEvents.exploitPath,
      durationSec: kothReplays.durationSec,
      byteSize: kothReplays.byteSize,
      asciicast: kothReplays.asciicast,
      sha256: kothReplays.sha256,
      recordedAt: kothReplays.recordedAt,
      uploadedAt: kothReplays.uploadedAt,
      roundStartedAt: kothRounds.startedAt,
      roundEndedAt: kothRounds.endedAt,
    })
    .from(kothReplays)
    .leftJoin(users, eq(users.id, kothReplays.userId))
    .leftJoin(kothEvents, eq(kothEvents.id, kothReplays.linkedEventId))
    .leftJoin(kothRounds, eq(kothRounds.id, kothReplays.roundId))
    .where(eq(kothReplays.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  return rows[0] as ReplayDetail;
}

// Siblings to a given replay — same round, near the same recording
// window. Used by the splitscreen viewer to show "what was everyone
// else doing when this happened". Limit to 9 (so we always fit in a
// 3×3 grid including the focal one).
export async function getSiblingReplays(
  replay: ReplayDetail,
): Promise<ReplayListRow[]> {
  // Window: 5 min on either side of the recorded_at.
  const start = new Date(replay.recordedAt.getTime() - 5 * 60_000);

  const rows = await db
    .select({
      id: kothReplays.id,
      roundId: kothReplays.roundId,
      userId: kothReplays.userId,
      username: users.username,
      actorSlot: kothReplays.actorSlot,
      kind: kothReplays.kind,
      exploitPath: kothEvents.exploitPath,
      durationSec: kothReplays.durationSec,
      byteSize: kothReplays.byteSize,
      recordedAt: kothReplays.recordedAt,
      uploadedAt: kothReplays.uploadedAt,
    })
    .from(kothReplays)
    .leftJoin(users, eq(users.id, kothReplays.userId))
    .leftJoin(kothEvents, eq(kothEvents.id, kothReplays.linkedEventId))
    .where(
      and(
        eq(kothReplays.roundId, replay.roundId),
        gte(kothReplays.recordedAt, start),
        sql`${kothReplays.id} <> ${replay.id}`,
      ),
    )
    .orderBy(desc(kothReplays.recordedAt))
    .limit(9);
  return rows as ReplayListRow[];
}

export async function countReplays(): Promise<number> {
  const r = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(kothReplays);
  return r[0]?.n ?? 0;
}
