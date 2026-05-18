import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { getReplayById } from "@/lib/koth/replays";
import { startRaceAttempt } from "@/lib/koth/races";

// POST /api/koth/race/start { replayId } → { attemptId, startedAt }
//
// Starts a Ghost-Race attempt. The replay must exist. The caller can
// be anonymous (no session cookie) — anonymous attempts are recorded
// as self_reported and rely on the client's "I took crown" claim
// rather than a server-side koth_events match.
//
// Why this is session-based and not bearer: this is a player-facing
// action (clicking the "race this ghost" button in the UI), not an
// arena daemon. Different auth surface than /api/koth/event + /replay.

export async function POST(req: Request) {
  let body: { replayId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (typeof body.replayId !== "string" || body.replayId.length === 0) {
    return NextResponse.json(
      { error: "replayId required (string)" },
      { status: 400 },
    );
  }
  const replayId = body.replayId;

  // UUID shape pre-validation.
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      replayId,
    )
  ) {
    return NextResponse.json({ error: "replayId not uuid" }, { status: 400 });
  }

  const replay = await getReplayById(replayId);
  if (!replay) {
    return NextResponse.json({ error: "replay not found" }, { status: 404 });
  }

  // Session resolution — userId is null for anonymous attempts.
  const { user } = await getCurrentSession();
  const userId = user?.id ?? null;

  const attempt = await startRaceAttempt(replayId, userId);

  return NextResponse.json(
    {
      attemptId: attempt.id,
      startedAt: attempt.startedAt.toISOString(),
      anonymous: userId == null,
    },
    { status: 201 },
  );
}
