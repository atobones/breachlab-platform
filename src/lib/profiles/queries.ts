import { and, asc, desc, eq, ilike, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  badges,
  levels,
  speedrunRuns,
  submissions,
  tracks,
  users,
} from "@/lib/db/schema";

export type ProfileBadge = {
  id: string;
  kind: string;
  refId: string | null;
  awardedAt: Date;
};

export type ProfileSpeedrun = {
  trackSlug: string;
  trackName: string;
  totalSeconds: number;
  reviewStatus: string;
};

export type Profile = {
  user: {
    id: string;
    username: string;
    joinedAt: Date;
    isSupporter: boolean;
    isHallOfFame: boolean;
    securityScore: number;
    discordUsername: string | null;
    discordId: string | null;
  };
  totalPoints: number;
  solvedLevels: number;
  badges: ProfileBadge[];
  speedruns: ProfileSpeedrun[];
};

export async function getProfileByUsername(
  username: string,
): Promise<Profile | null> {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      joinedAt: users.createdAt,
      isSupporter: users.isSupporter,
      isHallOfFame: users.isHallOfFame,
      securityScore: users.securityScore,
      discordUsername: users.discordUsername,
      discordId: users.discordId,
    })
    .from(users)
    .where(ilike(users.username, username))
    .limit(1);

  if (!user) return null;

  const [stats] = await db
    .select({
      totalPoints: sql<number>`coalesce(sum(${submissions.pointsAwarded}), 0)::int`,
      solvedLevels: sql<number>`count(*)::int`,
    })
    .from(submissions)
    .where(eq(submissions.userId, user.id));

  const userBadges = await db
    .select({
      id: badges.id,
      kind: badges.kind,
      refId: badges.refId,
      awardedAt: badges.awardedAt,
    })
    .from(badges)
    .where(eq(badges.userId, user.id))
    .orderBy(desc(badges.awardedAt));

  const runs = await db
    .select({
      trackSlug: tracks.slug,
      trackName: tracks.name,
      totalSeconds: speedrunRuns.totalSeconds,
      reviewStatus: speedrunRuns.reviewStatus,
    })
    .from(speedrunRuns)
    .innerJoin(tracks, eq(tracks.id, speedrunRuns.trackId))
    .where(
      and(
        eq(speedrunRuns.userId, user.id),
        ne(speedrunRuns.reviewStatus, "rejected"),
        isNotNull(speedrunRuns.finishedAt),
        isNotNull(speedrunRuns.totalSeconds),
      ),
    )
    .orderBy(asc(speedrunRuns.totalSeconds));

  // silence unused-import if levels ever gets dropped — levels join not needed here
  void levels;

  return {
    user,
    totalPoints: Number(stats?.totalPoints ?? 0),
    solvedLevels: Number(stats?.solvedLevels ?? 0),
    badges: userBadges,
    speedruns: runs.map((r) => ({
      trackSlug: r.trackSlug,
      trackName: r.trackName,
      totalSeconds: Number(r.totalSeconds),
      reviewStatus: r.reviewStatus,
    })),
  };
}
