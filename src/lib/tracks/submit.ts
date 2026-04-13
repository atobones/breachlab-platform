import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { flags, levels, submissions, tracks, users } from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { computeAwardedPoints } from "./points";
import { normalizeFlag, flagSchema } from "@/lib/validation/flags";
import { liveBus } from "@/lib/live/bus";

export type SubmitResult =
  | { ok: true; levelIdx: number; trackSlug: string; points: number }
  | { ok: false; error: string };

export async function submitFlag(
  userId: string,
  rawFlag: string,
  sourceIp: string | null
): Promise<SubmitResult> {
  const normalized = normalizeFlag(rawFlag);
  if (!flagSchema.safeParse(normalized).success) {
    return { ok: false, error: "Invalid flag format" };
  }

  const flagHash = await hashToken(normalized);
  const [flagRow] = await db
    .select()
    .from(flags)
    .where(eq(flags.flagHash, flagHash))
    .limit(1);
  if (!flagRow) return { ok: false, error: "Unknown flag" };

  const [level] = await db
    .select()
    .from(levels)
    .where(eq(levels.id, flagRow.levelId))
    .limit(1);
  if (!level) return { ok: false, error: "Unknown flag" };

  const existing = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(eq(submissions.userId, userId), eq(submissions.levelId, level.id))
    )
    .limit(1);
  if (existing.length > 0) {
    return { ok: false, error: "Already solved" };
  }

  const anyPrior = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(eq(submissions.levelId, level.id))
    .limit(1);
  const isFirstBlood = anyPrior.length === 0;

  const points = computeAwardedPoints(level, isFirstBlood);
  await db.insert(submissions).values({
    userId,
    levelId: level.id,
    pointsAwarded: points,
    sourceIp: sourceIp ?? undefined,
  });

  const [trackRow] = await db
    .select({ slug: tracks.slug })
    .from(tracks)
    .where(eq(tracks.id, level.trackId))
    .limit(1);
  const [userRow] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  liveBus.publish({
    type: "submission",
    at: new Date().toISOString(),
    username: userRow?.username ?? "unknown",
    trackSlug: trackRow?.slug ?? "unknown",
    levelIdx: level.idx,
    levelTitle: level.title,
  });

  return {
    ok: true,
    levelIdx: level.idx,
    trackSlug: trackRow?.slug ?? "",
    points,
  };
}
