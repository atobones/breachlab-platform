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
  // Public archive only surfaces crown_moment recordings — session_close
  // and ambient casts leak too much arena infrastructure (decoy paths,
  // drift script, recording wrapper, etc.) when a player's enumeration
  // commands traverse our managed binaries. They stay in the DB for
  // anti-cheat / forensic use; just not displayed. `q.kind` is ignored
  // and forced to crown_moment.
  conds.push(eq(kothReplays.kind, "crown_moment"));
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
    .where(
      and(eq(kothReplays.id, id), eq(kothReplays.kind, "crown_moment")),
    )
    .limit(1);
  if (rows.length === 0) return null;
  const row = rows[0] as ReplayDetail;
  // Fall back to deriving duration from the cast when the uploader
  // didn't populate it. Each event line is JSON [timestamp, kind, data];
  // the last event's timestamp = total recording length.
  if (row.durationSec == null && row.asciicast) {
    row.durationSec = deriveDurationFromCast(row.asciicast);
  }
  return row;
}

// Asciicast v2 is JSONL — first line is the header, subsequent lines
// are [timestamp_sec, "o"|"i", data]. The last event's timestamp is
// the recording duration. Cheap to do at render time.
export function deriveDurationFromCast(cast: string): number | null {
  let lastTs: number | null = null;
  let cursor = cast.length;
  // Walk backwards to find the last non-empty line — handles trailing
  // newlines and avoids splitting the whole document.
  for (let i = cast.length - 1; i >= 0; i--) {
    if (cast[i] === "\n") {
      const line = cast.slice(i + 1, cursor).trim();
      cursor = i;
      if (!line) continue;
      if (!line.startsWith("[")) continue; // header line — keep walking back
      try {
        const parsed = JSON.parse(line);
        if (Array.isArray(parsed) && typeof parsed[0] === "number") {
          lastTs = parsed[0];
          break;
        }
      } catch {
        // malformed line — keep walking
      }
    }
  }
  if (lastTs == null) return null;
  return Math.max(0, Math.round(lastTs));
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
        eq(kothReplays.kind, "crown_moment"),
        gte(kothReplays.recordedAt, start),
        sql`${kothReplays.id} <> ${replay.id}`,
      ),
    )
    .orderBy(desc(kothReplays.recordedAt))
    .limit(9);
  return rows as ReplayListRow[];
}

// Lookup the replay (if any) recorded for a specific crown_taken
// event. The uploader sets koth_replays.linked_event_id when the
// replay corresponds to a crown moment, so this gives us a clean
// "did this win produce a watchable ghost?" check. Used by the
// daily finish screen (#76) to surface "▸ race your past self".
export async function getReplayByEventId(
  eventId: number,
): Promise<{ id: string; durationSec: number | null } | null> {
  const rows = await db
    .select({
      id: kothReplays.id,
      durationSec: kothReplays.durationSec,
    })
    .from(kothReplays)
    .where(eq(kothReplays.linkedEventId, eventId))
    .orderBy(desc(kothReplays.uploadedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function countReplays(): Promise<number> {
  // Same scope as listReplays — count only crown_moment, since that's
  // what the archive surfaces.
  const r = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(kothReplays)
    .where(eq(kothReplays.kind, "crown_moment"));
  return r[0]?.n ?? 0;
}
