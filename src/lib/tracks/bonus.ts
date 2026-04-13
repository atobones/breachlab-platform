import { and, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { levels, submissions } from "@/lib/db/schema";
import { isHiddenLevel } from "./all";

/**
 * Whether the given user has unlocked the hidden bonus level of a track.
 * Rule: all non-hidden levels of the track must have a submission by the user.
 */
export async function hasUnlockedHiddenBonus(
  userId: string | null | undefined,
  trackId: string
): Promise<boolean> {
  if (!userId) return false;

  const publicLevels = await db
    .select({ id: levels.id, description: levels.description })
    .from(levels)
    .where(eq(levels.trackId, trackId));

  const publicLevelIds = publicLevels
    .filter((l) => !isHiddenLevel(l.description))
    .map((l) => l.id);

  if (publicLevelIds.length === 0) return false;

  const [row] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(submissions)
    .where(
      and(
        eq(submissions.userId, userId),
        inArray(submissions.levelId, publicLevelIds)
      )
    );
  return Number(row?.c ?? 0) >= publicLevelIds.length;
}
