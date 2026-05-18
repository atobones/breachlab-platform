import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import {
  getOrCreateTodaySeed,
  startDailyAttempt,
} from "@/lib/koth/daily";

// POST /api/koth/daily/start → { attemptId, startedAt, resumed, day, pathSlug }
//
// Starts (or resumes) today's daily challenge for the current viewer.
// One attempt per user per day — re-starting returns the existing
// attempt's id + original startedAt so the timer doesn't reset.

export async function POST() {
  const seed = await getOrCreateTodaySeed();
  if (!seed) {
    return NextResponse.json(
      { error: "no daily challenge available" },
      { status: 503 },
    );
  }

  const { user } = await getCurrentSession();
  const userId = user?.id ?? null;

  const attempt = await startDailyAttempt(seed.dayUtc, userId);

  return NextResponse.json(
    {
      attemptId: attempt.id,
      startedAt: attempt.startedAt.toISOString(),
      resumed: attempt.resumed,
      day: seed.dayUtc,
      pathSlug: seed.pathSlug,
      anonymous: userId == null,
    },
    { status: attempt.resumed ? 200 : 201 },
  );
}
