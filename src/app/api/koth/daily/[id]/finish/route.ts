import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { finishDailyAttempt, getDailyAttempt } from "@/lib/koth/daily";

// POST /api/koth/daily/[id]/finish { tookCrown?: boolean }
//   → { elapsedSec, tookCrown, selfReported, linkedEventId }

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

  const attempt = await getDailyAttempt(id);
  if (!attempt) {
    return NextResponse.json({ error: "attempt not found" }, { status: 404 });
  }

  const { user } = await getCurrentSession();
  if (attempt.userId != null && user?.id !== attempt.userId) {
    return NextResponse.json(
      { error: "not your attempt" },
      { status: 403 },
    );
  }

  // Strict verify — body no longer takes a tookCrown hint; the
  // oracle alone decides based on koth_events.
  const outcome = await finishDailyAttempt(id);
  if (!outcome) {
    return NextResponse.json({ error: "finish failed" }, { status: 500 });
  }
  return NextResponse.json(outcome, { status: 200 });
}
