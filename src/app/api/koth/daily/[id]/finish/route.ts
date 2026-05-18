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

  let body: { tookCrown?: unknown } = {};
  try {
    body = (await req.json()) as { tookCrown?: unknown };
  } catch {
    body = {};
  }
  const claimedTookCrown = body.tookCrown === true;

  const result = await finishDailyAttempt(id, { tookCrown: claimedTookCrown });
  if (!result) {
    return NextResponse.json({ error: "finish failed" }, { status: 500 });
  }
  return NextResponse.json(result, { status: 200 });
}
