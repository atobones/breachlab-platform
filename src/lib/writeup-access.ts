import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { levels, submissions, tracks } from "@/lib/db/schema";

export async function getCompletedLevelIdxs(
  userId: string,
  trackSlug: string,
): Promise<Set<number>> {
  const rows = await db
    .select({ idx: levels.idx })
    .from(submissions)
    .innerJoin(levels, eq(submissions.levelId, levels.id))
    .innerJoin(tracks, eq(levels.trackId, tracks.id))
    .where(
      and(
        eq(submissions.userId, userId),
        eq(tracks.slug, trackSlug),
        gt(submissions.pointsAwarded, 0),
      ),
    );
  return new Set(rows.map((r) => r.idx));
}

export async function userCompletedAllLevels(
  userId: string,
  trackSlug: string,
  requiredIdxs: number[],
): Promise<boolean> {
  if (requiredIdxs.length === 0) return true;
  const rows = await db
    .select({ idx: levels.idx })
    .from(submissions)
    .innerJoin(levels, eq(submissions.levelId, levels.id))
    .innerJoin(tracks, eq(levels.trackId, tracks.id))
    .where(
      and(
        eq(submissions.userId, userId),
        eq(tracks.slug, trackSlug),
        inArray(levels.idx, requiredIdxs),
        gt(submissions.pointsAwarded, 0),
      ),
    );
  const have = new Set(rows.map((r) => r.idx));
  return requiredIdxs.every((i) => have.has(i));
}
