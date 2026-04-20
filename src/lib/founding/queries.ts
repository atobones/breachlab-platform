import { asc, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { badges, users } from "@/lib/db/schema";

export const FOUNDING_CAP = 100;

// Founding seats are reserved for graduates of Phantom or higher tracks.
// Ghost is the entry exam — gating Founding on Ghost would burn the 100
// seats on people who only cleared the easy track and never came back
// for the hard work. Add future pro tracks (mirage_*, etc.) here as
// they ship.
const FOUNDING_TRACK_KINDS = ["phantom_master"] as const;

export type FoundingOperative = {
  rank: number;
  username: string;
  earnedAt: Date;
  tracks: string[];
};

export type FoundingCohort = {
  cap: number;
  claimed: number;
  remaining: number;
  operatives: FoundingOperative[];
};

export async function getFoundingCohort(): Promise<FoundingCohort> {
  const earliestPerUser = db
    .select({
      userId: badges.userId,
      firstAt: sql<Date>`min(${badges.awardedAt})`.as("first_at"),
      tracks: sql<string[]>`array_agg(distinct ${badges.kind})`.as("tracks"),
    })
    .from(badges)
    .where(inArray(badges.kind, [...FOUNDING_TRACK_KINDS]))
    .groupBy(badges.userId)
    .as("earliest_per_user");

  const rows = await db
    .select({
      username: users.username,
      earnedAt: earliestPerUser.firstAt,
      tracks: earliestPerUser.tracks,
    })
    .from(earliestPerUser)
    .innerJoin(users, sql`${users.id} = ${earliestPerUser.userId}`)
    .orderBy(asc(earliestPerUser.firstAt))
    .limit(FOUNDING_CAP);

  const operatives = rows.map((r, i) => ({
    rank: i + 1,
    username: r.username,
    // postgres-js returns timestamp columns as Date, but values produced
    // by aggregate sql templates (min/max/etc) come back as ISO strings
    // — coerce here so consumers can call Intl.DateTimeFormat.format on
    // it without a RangeError.
    earnedAt:
      r.earnedAt instanceof Date
        ? r.earnedAt
        : new Date(r.earnedAt as unknown as string),
    tracks: (r.tracks ?? []).map(prettifyKind).sort(),
  }));

  return {
    cap: FOUNDING_CAP,
    claimed: operatives.length,
    remaining: Math.max(0, FOUNDING_CAP - operatives.length),
    operatives,
  };
}

function prettifyKind(kind: string): string {
  if (kind === "ghost_graduate") return "Ghost";
  if (kind === "phantom_master") return "Phantom";
  return kind;
}
