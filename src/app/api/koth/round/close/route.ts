import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothRounds } from "@/lib/db/schema";
import { safeBearerMatch } from "@/lib/auth/tokens";
import { awardRoundWinner } from "@/lib/koth/honors";
import { postKothRoundCloseToDiscord } from "@/lib/koth/discord";
import { rotateCrownChampionRole } from "@/lib/koth/crown-role";

// Close an active KoTH round. Called by reset-arena.sh before opening
// a new round (defensive — open also force-resets any active rounds,
// but explicit close is cheaper than relying on the implicit path).
//
// On successful close we ALSO award the round_winner honor (top
// scorer, idempotent via unique partial index) and broadcast a
// summary line to Discord. Both are fire-and-forget so the cron's
// curl returns fast regardless of DB/Discord state.
//
// Payload:
//   { round_id: string, reason?: string }

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

  const closedAt = new Date();
  const result = await db
    .update(kothRounds)
    .set({
      status: "completed",
      endedAt: closedAt,
      resetReason: body.reason ?? "explicit-close",
    })
    .where(
      and(eq(kothRounds.id, body.round_id), eq(kothRounds.status, "active")),
    )
    .returning({ id: kothRounds.id });

  if (result.length === 0) {
    return NextResponse.json(
      { error: "no active round with that id" },
      { status: 404 },
    );
  }

  // Award round winner — idempotent. Don't await — keep this endpoint
  // fast for cron timing predictability. Side effects: Discord summary
  // post + Crown Champion role rotation (one-holder-at-a-time).
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
      // Move the 👑 Crown Champion Discord role to the new winner.
      // Silently no-ops if the winner hasn't linked Discord or the
      // role env isn't configured.
      rotateCrownChampionRole(winner.userId).catch(() => {});
    })
    .catch(() => {
      // best-effort
    });

  return NextResponse.json({ ok: true });
}
