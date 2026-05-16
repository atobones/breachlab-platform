import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothEvents, kothRounds, kothSshKeys, users } from "@/lib/db/schema";
import { safeBearerMatch } from "@/lib/auth/tokens";
import { resolveSlotToUserId, isValidEventKind } from "@/lib/koth/slots";
import { postKothEventToDiscord } from "@/lib/koth/discord";

// Crown daemon oracle endpoint. The daemon runs inside the KoTH arena
// container (Wave B1) and POSTs here every time it detects a crown
// state change in /root/.crown — or one of the synthetic events
// (patched, escalated). The bearer token is the same KOTH_ORACLE_TOKEN
// shared between the host's .env and this endpoint's env.
//
// points_delta is left at 0 here. The scoring engine (Wave D1) reads
// the event log periodically and writes computed points into
// koth_scores. This keeps the daemon dumb and the scoring rules
// hot-swappable from the platform side.
//
// Payload:
//   {
//     round_id:     uuid string,
//     kind:         "crown_taken" | "dethroned" | "patched" | "escalated" | "tutorial",
//     actor_slot:   "koth0".."koth9" | null,
//     target_slot:  "koth0".."koth9" | null,    // dethrone target, optional
//     exploit_path: "l7-suid" | "l8-suid" | "l17-redis" | "crontab" | "unknown",
//     raw_meta:     object | null,             // free-form daemon context
//   }

export async function POST(req: Request) {
  const expected = process.env.KOTH_ORACLE_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "KOTH_ORACLE_TOKEN not configured" },
      { status: 500 },
    );
  }
  if (!safeBearerMatch(req.headers.get("authorization"), expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    round_id?: string;
    kind?: string;
    actor_slot?: string | null;
    target_slot?: string | null;
    exploit_path?: string | null;
    raw_meta?: Record<string, unknown> | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.round_id || typeof body.round_id !== "string") {
    return NextResponse.json({ error: "round_id required" }, { status: 400 });
  }
  if (!isValidEventKind(body.kind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  }

  // Round must exist and be active. Daemon should never report against
  // a closed round (would happen during the brief window of a forced
  // reset before the daemon picks up the new round_id from .env).
  const [round] = await db
    .select({ id: kothRounds.id, status: kothRounds.status })
    .from(kothRounds)
    .where(eq(kothRounds.id, body.round_id))
    .limit(1);

  if (!round) {
    return NextResponse.json({ error: "unknown round" }, { status: 404 });
  }
  if (round.status !== "active") {
    return NextResponse.json(
      { error: `round ${body.round_id} is ${round.status}` },
      { status: 409 },
    );
  }

  const [actorUserId, targetUserId] = await Promise.all([
    resolveSlotToUserId(body.actor_slot),
    resolveSlotToUserId(body.target_slot),
  ]);

  // Stash the unresolved slot strings in raw_meta so we can debug
  // attribution misses (slot was reported but no koth_ssh_keys row
  // matched yet).
  const meta: Record<string, unknown> = {
    ...(body.raw_meta ?? {}),
    actor_slot: body.actor_slot ?? null,
    target_slot: body.target_slot ?? null,
  };

  const [inserted] = await db
    .insert(kothEvents)
    .values({
      roundId: body.round_id,
      kind: body.kind,
      actorUserId: actorUserId,
      targetUserId: targetUserId,
      exploitPath: body.exploit_path ?? null,
      pointsDelta: 0,
      rawMeta: meta,
    })
    .returning({ id: kothEvents.id, occurredAt: kothEvents.occurredAt });

  // Tutorial tracking (Wave D2 — minimal): mark the actor's first
  // crown_taken event as their tutorial completion. Cheap UPDATE
  // guarded on tutorial_completed_at IS NULL so it only fires once.
  if (body.kind === "crown_taken" && actorUserId) {
    try {
      await db
        .update(kothSshKeys)
        .set({ tutorialCompletedAt: sql`now()` })
        .where(
          and(
            eq(kothSshKeys.userId, actorUserId),
            isNull(kothSshKeys.tutorialCompletedAt),
          ),
        );
    } catch {
      // best-effort — tutorial flag is cosmetic
    }
  }

  // Look up display names for the Discord post. Two lookups; both
  // fire-and-forget so the daemon still gets its 200 fast even if
  // Discord/DB hiccups.
  let actorUsername: string | null = null;
  let targetUsername: string | null = null;
  if (actorUserId) {
    const [u] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, actorUserId))
      .limit(1);
    actorUsername = u?.username ?? null;
  }
  if (targetUserId) {
    const [u] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    targetUsername = u?.username ?? null;
  }

  postKothEventToDiscord({
    kind: body.kind,
    actorUsername,
    targetUsername,
    exploitPath: body.exploit_path ?? null,
    occurredAt: inserted.occurredAt,
  });

  return NextResponse.json({ ok: true, event_id: inserted.id });
}
