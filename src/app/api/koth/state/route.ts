import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothEvents, kothRounds, users } from "@/lib/db/schema";
import { topNForRound } from "@/lib/koth/scoring";
import { currentPricesForRound } from "@/lib/koth/paths";

// Public live state of the KoTH arena. The /battles/koth page polls
// this. Returns: active round (if any), current king, top 5 scorers,
// last 10 events as feed lines, current Diamond prices per path
// (Phase 2), and the next-escalation hint.
//
// No auth — read-only public surface.

export const dynamic = "force-dynamic";

const ROUND_DURATION_SECONDS = 30 * 60;
const ESCALATION_THRESHOLD_SECONDS = 300; // mirrors escalation-daemon

type EventMeta = { value_snapshot?: number };
function snapOf(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const v = (raw as EventMeta).value_snapshot;
  return typeof v === "number" ? v : null;
}

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
      paths: [],
      escalation: null,
    });
  }

  const ageSeconds = Math.max(
    0,
    Math.floor((Date.now() - round.startedAt.getTime()) / 1000),
  );

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

  const top5Rows = await topNForRound(round.id, 5);

  const feedRows = await db
    .select({
      occurredAt: kothEvents.occurredAt,
      kind: kothEvents.kind,
      exploitPath: kothEvents.exploitPath,
      actorUsername: users.username,
      rawMeta: kothEvents.rawMeta,
    })
    .from(kothEvents)
    .leftJoin(users, eq(users.id, kothEvents.actorUserId))
    .where(eq(kothEvents.roundId, round.id))
    .orderBy(desc(kothEvents.occurredAt))
    .limit(10);

  const feed = feedRows.map((r) => {
    const ts = r.occurredAt.toISOString().slice(11, 19);
    const actor = r.actorUsername ?? "unknown";
    const snap = snapOf(r.rawMeta);
    const v = snap != null ? ` (+${snap} pt)` : "";
    const path = r.exploitPath ? ` via ${r.exploitPath}${v}` : "";
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
      case "path_patched_attributed":
        line = `${actor} closed ${r.exploitPath ?? "an exploit"} (path-attributed +5)`;
        break;
      case "escalated":
        line = `escalation: new path open${path}`;
        break;
      case "path_activated":
        line = `new path opened: ${r.exploitPath ?? "?"}`;
        break;
      case "tutorial":
        line = `${actor} cleared the tutorial`;
        break;
      default:
        line = `${actor} ${r.kind}${path}`;
    }
    return { ts, kind: r.kind, line };
  });

  // Phase 2 — Diamond commodity HUD data + escalation countdown.
  const paths = await currentPricesForRound(round.id);
  const escalationEtaSeconds =
    king && king.hold_seconds < ESCALATION_THRESHOLD_SECONDS
      ? ESCALATION_THRESHOLD_SECONDS - king.hold_seconds
      : null;

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
    paths,
    escalation: {
      threshold_seconds: ESCALATION_THRESHOLD_SECONDS,
      eta_seconds: escalationEtaSeconds,
    },
  });
}
