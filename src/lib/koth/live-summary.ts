import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothEvents, kothRounds, users } from "@/lib/db/schema";

// One-line summary of the live KoTH state, formatted for tight surfaces
// (Ops Wall right-rail Predator card, sidebar BattlesWidget).
//
// Examples:
//   "round live · 7:42 left · king alice 0:31"
//   "round live · 12:08 left · crown vacant"
//   "arena resetting · no active round"

export type KothLiveSummary = {
  hasRound: boolean;
  ageSeconds: number;
  remainingSeconds: number;
  kingUsername: string | null;
  kingHoldSeconds: number;
  oneLiner: string;
};

const ROUND_DURATION = 30 * 60;

function fmt(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export async function getKothLiveSummary(): Promise<KothLiveSummary> {
  const [round] = await db
    .select({
      id: kothRounds.id,
      startedAt: kothRounds.startedAt,
      engagedAt: kothRounds.engagedAt,
    })
    .from(kothRounds)
    .where(eq(kothRounds.status, "active"))
    .orderBy(desc(kothRounds.startedAt))
    .limit(1);

  if (!round) {
    return {
      hasRound: false,
      ageSeconds: 0,
      remainingSeconds: 0,
      kingUsername: null,
      kingHoldSeconds: 0,
      oneLiner: "arena resetting · no active round",
    };
  }

  const engaged = round.engagedAt !== null;
  const ageSeconds = engaged
    ? Math.floor((Date.now() - round.engagedAt!.getTime()) / 1000)
    : 0;
  const remainingSeconds = engaged
    ? Math.max(0, ROUND_DURATION - ageSeconds)
    : ROUND_DURATION;

  const [kingEvent] = await db
    .select({
      occurredAt: kothEvents.occurredAt,
      username: users.username,
    })
    .from(kothEvents)
    .leftJoin(users, eq(users.id, kothEvents.actorUserId))
    .where(eq(kothEvents.kind, "crown_taken"))
    .orderBy(desc(kothEvents.occurredAt))
    .limit(1);

  const kingUsername = kingEvent?.username ?? null;
  const kingHoldSeconds =
    kingEvent && kingUsername
      ? Math.floor((Date.now() - kingEvent.occurredAt.getTime()) / 1000)
      : 0;

  const oneLiner = !engaged
    ? "arena standing by · clock starts on first crown grab"
    : kingUsername
      ? `round live · ${fmt(remainingSeconds)} left · king ${kingUsername} ${fmt(kingHoldSeconds)}`
      : `round live · ${fmt(remainingSeconds)} left · crown vacant`;

  return {
    hasRound: true,
    ageSeconds,
    remainingSeconds,
    kingUsername,
    kingHoldSeconds,
    oneLiner,
  };
}
