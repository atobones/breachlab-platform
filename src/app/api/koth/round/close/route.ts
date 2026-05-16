import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothRounds } from "@/lib/db/schema";
import { safeBearerMatch } from "@/lib/auth/tokens";
import { awardRoundWinner } from "@/lib/koth/honors";
import { postKothRoundCloseToDiscord } from "@/lib/koth/discord";
import { rotateCrownChampionRole } from "@/lib/koth/crown-role";

// Close an active KoTH round — but only if it's actually due.
//
// Engaged-on-first-crown model: a round's 30-minute clock doesn't
// start until the first crown_taken in that round sets engaged_at.
// This endpoint is called every minute by reset-arena.sh; it no-ops
// unless engaged_at is set AND we're past engaged_at + 30min. The
// arena container therefore stays warm between players, and a fresh
// recreate only happens when an actually-played round wraps up.
//
// On successful close: award round_winner honor (idempotent), post
// the Discord summary, and rotate the Crown Champion role. All side
// effects are fire-and-forget so the endpoint returns fast.
//
// Payload:
//   { round_id: string, reason?: string }
// Response:
//   { ok: true, closed: boolean, reason?: string }

const ROUND_DURATION_MS = 30 * 60 * 1000;

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

  let body: { round_id?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.round_id || typeof body.round_id !== "string") {
    return NextResponse.json({ error: "round_id required" }, { status: 400 });
  }

  // Fetch the round first so we can check engagement state before
  // anything irreversible. If it's not eligible we just return
  // { closed: false } and the caller (reset-arena.sh) skips the
  // container recreate.
  const [round] = await db
    .select({
      id: kothRounds.id,
      status: kothRounds.status,
      engagedAt: kothRounds.engagedAt,
    })
    .from(kothRounds)
    .where(eq(kothRounds.id, body.round_id))
    .limit(1);

  if (!round) {
    return NextResponse.json(
      { ok: false, error: "unknown round" },
      { status: 404 },
    );
  }
  if (round.status !== "active") {
    return NextResponse.json({
      ok: true,
      closed: false,
      reason: `round is ${round.status}`,
    });
  }
  if (!round.engagedAt) {
    return NextResponse.json({
      ok: true,
      closed: false,
      reason: "not engaged — arena standing by",
    });
  }
  const ageMs = Date.now() - round.engagedAt.getTime();
  if (ageMs < ROUND_DURATION_MS) {
    return NextResponse.json({
      ok: true,
      closed: false,
      reason: "engaged but not yet past 30-minute window",
      seconds_remaining: Math.ceil((ROUND_DURATION_MS - ageMs) / 1000),
    });
  }

  // Eligible — close the round.
  const closedAt = new Date();
  const result = await db
    .update(kothRounds)
    .set({
      status: "completed",
      endedAt: closedAt,
      resetReason: body.reason ?? "engaged-window-expired",
    })
    .where(
      and(eq(kothRounds.id, body.round_id), eq(kothRounds.status, "active")),
    )
    .returning({ id: kothRounds.id });

  if (result.length === 0) {
    // Race with another close — treat as no-op success.
    return NextResponse.json({ ok: true, closed: false, reason: "race lost" });
  }

  // Award round winner — idempotent via the unique partial index.
  // Fire-and-forget so the cron's curl returns fast.
  awardRoundWinner(body.round_id)
    .then((winner) => {
      if (!winner) return;
      postKothRoundCloseToDiscord({
        winnerUsername: winner.username,
        points: winner.points,
        dethrones: winner.dethrones,
        crownDurationSeconds: winner.crownDurationSeconds,
        closedAt,
      });
      rotateCrownChampionRole(winner.userId).catch(() => {});
    })
    .catch(() => {
      // best-effort
    });

  return NextResponse.json({ ok: true, closed: true });
}
