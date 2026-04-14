import { and, asc, desc, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { speedrunRuns, tracks, users } from "@/lib/db/schema";

export type SpeedrunRow = {
  username: string;
  totalSeconds: number;
  isSuspicious: boolean;
  reviewStatus: string;
  finishedAt: Date;
};

export async function getTopSpeedruns(
  slug: string,
  limit: number,
): Promise<SpeedrunRow[]> {
  const rows = await db
    .select({
      username: users.username,
      totalSeconds: speedrunRuns.totalSeconds,
      isSuspicious: speedrunRuns.isSuspicious,
      reviewStatus: speedrunRuns.reviewStatus,
      finishedAt: speedrunRuns.finishedAt,
    })
    .from(speedrunRuns)
    .innerJoin(tracks, eq(tracks.id, speedrunRuns.trackId))
    .innerJoin(users, eq(users.id, speedrunRuns.userId))
    .where(
      and(
        eq(tracks.slug, slug),
        ne(speedrunRuns.reviewStatus, "rejected"),
        isNotNull(speedrunRuns.finishedAt),
        isNotNull(speedrunRuns.totalSeconds),
      ),
    )
    .orderBy(asc(speedrunRuns.totalSeconds))
    .limit(limit);

  return rows.map((r) => ({
    username: r.username,
    totalSeconds: Number(r.totalSeconds),
    isSuspicious: r.isSuspicious,
    reviewStatus: r.reviewStatus,
    finishedAt: r.finishedAt as Date,
  }));
}

export type SuspiciousRunRow = {
  id: string;
  username: string;
  trackSlug: string;
  trackName: string;
  totalSeconds: number | null;
  startedAt: Date;
  finishedAt: Date | null;
};

export async function getSuspiciousRuns(): Promise<SuspiciousRunRow[]> {
  const rows = await db
    .select({
      id: speedrunRuns.id,
      username: users.username,
      trackSlug: tracks.slug,
      trackName: tracks.name,
      totalSeconds: speedrunRuns.totalSeconds,
      startedAt: speedrunRuns.startedAt,
      finishedAt: speedrunRuns.finishedAt,
    })
    .from(speedrunRuns)
    .innerJoin(users, eq(users.id, speedrunRuns.userId))
    .innerJoin(tracks, eq(tracks.id, speedrunRuns.trackId))
    .where(
      and(
        eq(speedrunRuns.isSuspicious, true),
        eq(speedrunRuns.reviewStatus, "pending"),
      ),
    )
    .orderBy(desc(speedrunRuns.startedAt));

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    trackSlug: r.trackSlug,
    trackName: r.trackName,
    totalSeconds: r.totalSeconds === null ? null : Number(r.totalSeconds),
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
  }));
}
