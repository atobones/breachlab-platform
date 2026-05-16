import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothEvents, kothRounds, kothScores, users } from "@/lib/db/schema";

// Public live state of the KoTH arena. The /battles/koth page polls
// this. Returns: active round (if any), current king (most recent
// crown_taken actor in the active round + hold duration), top 5
// scorers, last 10 events as feed lines.
//
// No auth — read-only public surface, same posture as the leaderboard.

export const dynamic = "force-dynamic";

const ROUND_DURATION_SECONDS = 20 * 60;

export async function GET() {
  const [round] = await db
    .select({
      id: kothRounds.id,
      startedAt: kothRounds.startedAt,
    })
    .from(kothRounds)
    .where(eq(kothRounds.status, "active"))
    .orderBy(desc(kothRounds.startedAt))
    .limit(1);

  if (!round) {
    return NextResponse.json({
      round: null,
      king: null,
      top5: [],
      feed: [],
    });
  }

  const ageSeconds = Math.max(
    0,
    Math.floor((Date.now() - round.startedAt.getTime()) / 1000),
  );

  // Most recent crown_taken in this round = current king. Join users
  // for the display name. If actor_user_id is NULL (slot unbound), no
  // king is attributable — daemon saw a change but we don't know who.
  const [kingEvent] = await db
    .select({
      occurredAt: kothEvents.occurredAt,
      exploitPath: kothEvents.exploitPath,
      username: users.username,
      userId: users.id,
    })
    .from(kothEvents)
    .leftJoin(users, eq(users.id, kothEvents.actorUserId))
    .where(eq(kothEvents.kind, "crown_taken"))
    .orderBy(desc(kothEvents.occurredAt))
    .limit(1);

  const king =
    kingEvent && kingEvent.username
      ? {
          username: kingEvent.username,
          since: kingEvent.occurredAt,
          hold_seconds: Math.max(
            0,
            Math.floor((Date.now() - kingEvent.occurredAt.getTime()) / 1000),
          ),
          exploit_path: kingEvent.exploitPath,
        }
      : null;

  const top5Rows = await db
    .select({
      username: users.username,
      points: kothScores.points,
      dethrones: kothScores.dethrones,
      patches: kothScores.patches,
    })
    .from(kothScores)
    .innerJoin(users, eq(users.id, kothScores.userId))
    .where(eq(kothScores.roundId, round.id))
    .orderBy(desc(kothScores.points))
    .limit(5);

  const feedRows = await db
    .select({
      occurredAt: kothEvents.occurredAt,
      kind: kothEvents.kind,
      exploitPath: kothEvents.exploitPath,
      actorUsername: users.username,
      targetMeta: kothEvents.rawMeta,
    })
    .from(kothEvents)
    .leftJoin(users, eq(users.id, kothEvents.actorUserId))
    .where(eq(kothEvents.roundId, round.id))
    .orderBy(desc(kothEvents.occurredAt))
    .limit(10);

  const feed = feedRows.map((r) => {
    const ts = r.occurredAt.toISOString().slice(11, 19);
    const actor = r.actorUsername ?? "unknown";
    const path = r.exploitPath ? ` via ${r.exploitPath}` : "";
    let line: string;
    switch (r.kind) {
      case "crown_taken":
        line = `${actor} took the crown${path}`;
        break;
      case "dethroned":
        line = `${actor} dethroned the king${path}`;
        break;
      case "patched":
        line = `${actor} patched ${r.exploitPath ?? "an exploit"}`;
        break;
      case "escalated":
        line = `escalation: new path open${path}`;
        break;
      case "tutorial":
        line = `${actor} cleared the tutorial`;
        break;
      default:
        line = `${actor} ${r.kind}${path}`;
    }
    return { ts, kind: r.kind, line };
  });

  return NextResponse.json({
    round: {
      id: round.id,
      started_at: round.startedAt,
      age_seconds: ageSeconds,
      ends_at_estimate_seconds: Math.max(0, ROUND_DURATION_SECONDS - ageSeconds),
    },
    king,
    top5: top5Rows,
    feed,
  });
}
