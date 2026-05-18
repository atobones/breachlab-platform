import { and, desc, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  kothAuditEvents,
  kothEvents,
  kothRounds,
  users,
} from "@/lib/db/schema";

// Crown Wars — Live Audit Feed.
//
// Persistence + read helpers for syscall events captured by the
// sidecar's outside-the-arena strace pipeline (Phase B). All writes
// land via /api/koth/audit; all reads (initial paint + SSE poll-tail)
// go through here.

const VALID_CLASSES = new Set([
  "execve",
  "openat",
  "setuid",
  "network",
  "fs",
  "other",
]);

export type AuditClass =
  | "execve"
  | "openat"
  | "setuid"
  | "network"
  | "fs"
  | "other";

export type AuditEventInput = {
  roundId: string;
  actorUserId?: string | null;
  actorSlot?: string | null;
  syscallClass: AuditClass | string;
  summary: string;
  occurredAt?: Date;
};

// Insert a batch of audit events. The streamer batches to keep
// network and write overhead low — one strace stream produces dozens
// of execve per second on a busy crown holder.
export async function recordAuditBatch(events: AuditEventInput[]): Promise<{
  inserted: number;
  rejected: { idx: number; reason: string }[];
}> {
  const rejected: { idx: number; reason: string }[] = [];
  const safe: AuditEventInput[] = [];

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e.roundId) {
      rejected.push({ idx: i, reason: "missing round_id" });
      continue;
    }
    if (!VALID_CLASSES.has(e.syscallClass)) {
      rejected.push({ idx: i, reason: "invalid syscall_class" });
      continue;
    }
    const summary = (e.summary ?? "").slice(0, 1024);
    if (summary.length === 0) {
      rejected.push({ idx: i, reason: "empty summary" });
      continue;
    }
    safe.push({ ...e, summary });
  }

  if (safe.length === 0) return { inserted: 0, rejected };

  await db.insert(kothAuditEvents).values(
    safe.map((e) => ({
      roundId: e.roundId,
      actorUserId: e.actorUserId ?? null,
      actorSlot: e.actorSlot ?? null,
      syscallClass: e.syscallClass,
      summary: e.summary,
      occurredAt: e.occurredAt ?? new Date(),
    })),
  );
  return { inserted: safe.length, rejected };
}

export type AuditLine = {
  id: number;
  occurredAt: Date;
  syscallClass: string;
  summary: string;
  actorUserId: string | null;
  actorSlot: string | null;
  actorUsername: string | null;
};

// Fetch last N audit lines for the current active round, optionally
// filtered to a single actor (the live widget's default mode).
export async function recentAudit(opts: {
  roundId: string;
  actorUserId?: string | null;
  limit?: number;
  sinceId?: number;
}): Promise<AuditLine[]> {
  const where = opts.sinceId
    ? and(
        eq(kothAuditEvents.roundId, opts.roundId),
        gt(kothAuditEvents.id, opts.sinceId),
      )
    : eq(kothAuditEvents.roundId, opts.roundId);
  const conds = [where];
  if (opts.actorUserId != null) {
    conds.push(eq(kothAuditEvents.actorUserId, opts.actorUserId));
  }
  const rows = await db
    .select({
      id: kothAuditEvents.id,
      occurredAt: kothAuditEvents.occurredAt,
      syscallClass: kothAuditEvents.syscallClass,
      summary: kothAuditEvents.summary,
      actorUserId: kothAuditEvents.actorUserId,
      actorSlot: kothAuditEvents.actorSlot,
      actorUsername: users.username,
    })
    .from(kothAuditEvents)
    .leftJoin(users, eq(users.id, kothAuditEvents.actorUserId))
    .where(and(...conds))
    .orderBy(opts.sinceId ? kothAuditEvents.id : desc(kothAuditEvents.id))
    .limit(opts.limit ?? 50);

  // When pulling "newest first" via desc(id) we reverse so chrono
  // order matches what the UI renders (oldest at top, newest at
  // bottom — same as a tail).
  return opts.sinceId ? rows : rows.reverse();
}

// Current round id helper — replicates the same scoping used by
// /battles/koth so audit lines are always tied to a live round.
export async function currentRoundId(): Promise<string | null> {
  const r = await db
    .select({ id: kothRounds.id })
    .from(kothRounds)
    .where(eq(kothRounds.status, "active"))
    .orderBy(desc(kothRounds.startedAt))
    .limit(1);
  return r[0]?.id ?? null;
}

// Current crown holder (actor_user_id of the latest crown_taken in
// the current round). Used by the widget to filter audit to "what
// the king is doing right now".
export async function currentCrownHolder(roundId: string): Promise<{
  userId: string;
  username: string | null;
  slot: string | null;
} | null> {
  const r = await db
    .select({
      actorUserId: kothEvents.actorUserId,
      username: users.username,
      slot: kothEvents.rawMeta,
    })
    .from(kothEvents)
    .leftJoin(users, eq(users.id, kothEvents.actorUserId))
    .where(
      and(eq(kothEvents.kind, "crown_taken"), eq(kothEvents.roundId, roundId)),
    )
    .orderBy(desc(kothEvents.occurredAt))
    .limit(1);
  if (r.length === 0 || !r[0].actorUserId) return null;
  let slot: string | null = null;
  const meta = r[0].slot;
  if (meta && typeof meta === "object" && "actor_slot" in (meta as object)) {
    const v = (meta as { actor_slot?: unknown }).actor_slot;
    if (typeof v === "string") slot = v;
  }
  return { userId: r[0].actorUserId, username: r[0].username, slot };
}
