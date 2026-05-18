import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { kothReplays } from "@/lib/db/schema";
import { safeBearerMatch } from "@/lib/auth/tokens";
import { resolveSlotToUserId } from "@/lib/koth/slots";

// Ghost Replay upload endpoint.
//
// Called by the koth-sidecar's `replay-uploader` daemon after it pulls
// a finished asciinema cast out of the arena (PAM session_close hook or
// crown_moment trigger). The arena itself never talks to this endpoint
// — only the sidecar does, with the shared bearer token.
//
// Idempotency: sha256(asciicast) is UNIQUE in the table. Re-uploads of
// the same cast (e.g. retries after a network glitch) return 200 with
// the existing row's id, never insert duplicates.
//
// Hard size ceiling: 5 MiB. Matches the DB CHECK constraint and the
// sidecar's local refusal threshold. Anything bigger is treated as a
// recording-fill-disk attempt and refused.

const MAX_CAST_BYTES = 5 * 1024 * 1024; // 5 MiB
const VALID_KINDS = new Set(["session_close", "crown_moment", "ambient"]);

type Payload = {
  round_id?: string;
  actor_slot?: string;
  kind?: string;
  duration_sec?: number | null;
  recorded_at?: string;
  asciicast?: string;
  linked_event_id?: number | null;
};

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

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Field validation. Each error is specific so the sidecar logs are
  // useful — these come from our own daemon, not user input.
  if (!body.round_id || typeof body.round_id !== "string") {
    return NextResponse.json({ error: "round_id required" }, { status: 400 });
  }
  if (!body.actor_slot || !/^koth[0-9]$/.test(body.actor_slot)) {
    return NextResponse.json(
      { error: "actor_slot must match ^koth[0-9]$" },
      { status: 400 },
    );
  }
  if (!body.kind || !VALID_KINDS.has(body.kind)) {
    return NextResponse.json(
      { error: `kind must be one of ${[...VALID_KINDS].join("|")}` },
      { status: 400 },
    );
  }
  if (!body.recorded_at || isNaN(Date.parse(body.recorded_at))) {
    return NextResponse.json(
      { error: "recorded_at must be an ISO-8601 timestamp" },
      { status: 400 },
    );
  }
  if (typeof body.asciicast !== "string" || body.asciicast.length === 0) {
    return NextResponse.json(
      { error: "asciicast required (non-empty string)" },
      { status: 400 },
    );
  }

  const byteSize = Buffer.byteLength(body.asciicast, "utf8");
  if (byteSize > MAX_CAST_BYTES) {
    return NextResponse.json(
      { error: `cast exceeds ${MAX_CAST_BYTES} byte ceiling` },
      { status: 413 },
    );
  }

  // Shape check on the asciinema v2 header. The first line of a v2 cast
  // is a JSON object with version=2; events follow as [time, "o", text]
  // tuples per line. We don't deep-parse — just verify the header so we
  // don't accept arbitrary garbage as a "cast".
  const firstNewline = body.asciicast.indexOf("\n");
  const headerSrc =
    firstNewline === -1 ? body.asciicast : body.asciicast.slice(0, firstNewline);
  let header: unknown;
  try {
    header = JSON.parse(headerSrc);
  } catch {
    return NextResponse.json(
      { error: "asciicast first line is not valid JSON header" },
      { status: 400 },
    );
  }
  if (
    !header ||
    typeof header !== "object" ||
    (header as { version?: unknown }).version !== 2
  ) {
    return NextResponse.json(
      { error: "asciicast header must declare version=2" },
      { status: 400 },
    );
  }

  // Duration must be a positive number if provided. Null is allowed —
  // the sidecar may not always know (e.g. ambient recordings cut short).
  let durationSec: number | null = null;
  if (body.duration_sec != null) {
    if (typeof body.duration_sec !== "number" || body.duration_sec < 0) {
      return NextResponse.json(
        { error: "duration_sec must be a non-negative number" },
        { status: 400 },
      );
    }
    durationSec = Math.round(body.duration_sec);
  }

  let linkedEventId: number | null = null;
  if (body.linked_event_id != null) {
    if (
      typeof body.linked_event_id !== "number" ||
      !Number.isInteger(body.linked_event_id) ||
      body.linked_event_id <= 0
    ) {
      return NextResponse.json(
        { error: "linked_event_id must be a positive integer" },
        { status: 400 },
      );
    }
    linkedEventId = body.linked_event_id;
  }

  // Idempotency hash on the cast content.
  const sha = createHash("sha256").update(body.asciicast).digest("hex");

  // Resolve the slot string to a user id at upload time so the row is
  // searchable by user even after the round closes. Null is OK — the
  // slot may not be linked to a platform user (synthetic / test).
  const userId = await resolveSlotToUserId(body.actor_slot);

  // ON CONFLICT (sha256) DO NOTHING → idempotent. We still return the
  // existing row's id when the upload is a duplicate, so the sidecar
  // can mark its local pending-upload entry as resolved.
  try {
    const inserted = await db
      .insert(kothReplays)
      .values({
        roundId: body.round_id,
        userId,
        actorSlot: body.actor_slot,
        kind: body.kind,
        durationSec,
        asciicast: body.asciicast,
        byteSize,
        linkedEventId,
        recordedAt: new Date(body.recorded_at),
        sha256: sha,
      })
      .onConflictDoNothing({ target: kothReplays.sha256 })
      .returning({ id: kothReplays.id });

    if (inserted.length > 0) {
      return NextResponse.json(
        { id: inserted[0].id, status: "inserted", byteSize, sha256: sha },
        { status: 201 },
      );
    }

    // Conflict path — fetch the existing row's id so the sidecar gets a
    // stable reference even on retry.
    const existing = await db
      .select({ id: kothReplays.id })
      .from(kothReplays)
      .where(eq(kothReplays.sha256, sha))
      .limit(1);
    return NextResponse.json(
      {
        id: existing[0]?.id ?? null,
        status: "duplicate",
        byteSize,
        sha256: sha,
      },
      { status: 200 },
    );
  } catch (err) {
    // Foreign-key failures (unknown round_id, dangling linked_event_id)
    // surface here as Postgres errors. Surface a 400 with the message —
    // the sidecar can decide whether to retry or drop the cast.
    const message =
      err instanceof Error ? err.message : "unknown db error during insert";
    return NextResponse.json(
      { error: `insert failed: ${message}` },
      { status: 400 },
    );
  }
}

// GET unsupported — replays are read via the page-level loader, not the
// oracle endpoint. Keeping this surface POST-only also matches the
// existing /api/koth/event endpoint conventions.
export async function GET() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}

// Lightweight health probe — sidecar checks this on startup so it can
// fail fast if the platform isn't reachable. No auth required (only
// confirms the route is wired, doesn't leak state).
export async function HEAD() {
  // Tiny query to confirm DB connectivity without listing rows.
  await db
    .select({ n: sql<number>`1` })
    .from(kothReplays)
    .limit(0);
  return new NextResponse(null, { status: 200 });
}
