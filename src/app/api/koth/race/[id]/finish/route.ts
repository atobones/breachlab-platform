import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { finishRaceAttempt, getRaceAttempt } from "@/lib/koth/races";

// POST /api/koth/race/[id]/finish { tookCrown?: boolean }
//   → { elapsedSec, tookCrown, selfReported, linkedEventId }
//
// Finishes a race attempt. Authoritative timing comes from
// finished_at - started_at on the server side (we don't trust the
// client's clock). The "tookCrown" body field is treated as a
// self-report — only honored when the server can't verify via
// koth_events (anonymous attempts or platform users who haven't
// taken crown yet).
//
// Idempotent: re-POSTing a finished attempt returns the persisted
// values without re-running the verification.

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json({ error: "attempt id not uuid" }, { status: 400 });
  }

  const attempt = await getRaceAttempt(id);
  if (!attempt) {
    return NextResponse.json({ error: "attempt not found" }, { status: 404 });
  }

  // Ownership check — only the user who started the attempt (or
  // anyone, for anonymous attempts) can finish it. Prevents trolling
  // where someone forges a finish for another player.
  const { user } = await getCurrentSession();
  if (attempt.userId != null && user?.id !== attempt.userId) {
    return NextResponse.json(
      { error: "not your race attempt" },
      { status: 403 },
    );
  }

  let body: { tookCrown?: unknown } = {};
  try {
    body = (await req.json()) as { tookCrown?: unknown };
  } catch {
    // Empty body is fine — caller may just want to mark finish with
    // no crown claim (a give-up).
    body = {};
  }
  const claimedTookCrown = body.tookCrown === true;

  const result = await finishRaceAttempt(id, {
    tookCrown: claimedTookCrown,
  });
  if (!result) {
    return NextResponse.json({ error: "finish failed" }, { status: 500 });
  }

  return NextResponse.json(result, { status: 200 });
}
