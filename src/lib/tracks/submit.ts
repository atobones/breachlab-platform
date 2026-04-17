import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  flags,
  levels,
  submissions,
  tracks,
  users,
  badges,
} from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { computeAwardedPoints } from "./points";
import { normalizeFlag, flagSchema } from "@/lib/validation/flags";
import { liveBus } from "@/lib/live/bus";
import { decideBadgesToAward } from "@/lib/badges/award";
import { startRun, findOpenRun, closeRun } from "@/lib/speedrun/hooks";
import {
  announceFirstBlood,
  announceGhostGraduate,
  announcePhantomGraduate,
} from "@/lib/discord/announce";
import { operativeSerial } from "@/lib/certificate/serial";

export type SubmitResult =
  | { ok: true; levelIdx: number; trackSlug: string; points: number }
  | { ok: false; error: string };

export async function submitFlag(
  userId: string,
  rawFlag: string,
  sourceIp: string | null
): Promise<SubmitResult> {
  const normalized = normalizeFlag(rawFlag);
  const parsed = flagSchema.safeParse(normalized);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Flag must look like FLAG{...}.",
    };
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

  // Track completion detection — excludes hidden levels (marked with
  // a "[HIDDEN]" description prefix). Hidden bonuses are graduation,
  // not part of the public track completion set.
  const publicFilter = sql`coalesce(${levels.description}, '') not like '[HIDDEN]%'`;
  const [totalRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(levels)
    .where(and(eq(levels.trackId, level.trackId), publicFilter));
  const solvedInTrack = await db
    .select({ levelId: submissions.levelId })
    .from(submissions)
    .innerJoin(levels, eq(levels.id, submissions.levelId))
    .where(
      and(
        eq(submissions.userId, userId),
        eq(levels.trackId, level.trackId),
        publicFilter,
      ),
    );
  const totalInTrack = Number(totalRow?.total ?? 0);
  const trackCompleted =
    solvedInTrack.length >= totalInTrack && totalInTrack > 0;

  const [trackRow] = await db
    .select({ slug: tracks.slug })
    .from(tracks)
    .where(eq(tracks.id, level.trackId))
    .limit(1);

  const isGhostGraduate =
    trackRow?.slug === "ghost" && level.idx === 22;
  const isPhantomGraduate =
    trackRow?.slug === "phantom" && level.idx === 31;

  let alreadyGraduate = false;
  if (isGhostGraduate) {
    const existing = await db
      .select({ id: badges.id })
      .from(badges)
      .where(
        and(
          eq(badges.userId, userId),
          eq(badges.kind, "ghost_graduate"),
          eq(badges.refId, level.trackId),
        ),
      )
      .limit(1);
    alreadyGraduate = existing.length > 0;
  }

  let alreadyPhantomGraduate = false;
  if (isPhantomGraduate) {
    const existing = await db
      .select({ id: badges.id })
      .from(badges)
      .where(
        and(
          eq(badges.userId, userId),
          eq(badges.kind, "phantom_master"),
          eq(badges.refId, level.trackId),
        ),
      )
      .limit(1);
    alreadyPhantomGraduate = existing.length > 0;
  }

  const toAward = decideBadgesToAward({
    isFirstBlood,
    levelId: level.id,
    trackId: level.trackId,
    trackCompleted,
    isGhostGraduate: isGhostGraduate && !alreadyGraduate,
    isPhantomGraduate: isPhantomGraduate && !alreadyPhantomGraduate,
  });
  if (toAward.length > 0) {
    await db.insert(badges).values(
      toAward.map((b) => ({
        userId,
        kind: b.kind,
        refId: b.refId,
      }))
    );
  }

  // Speedrun hooks: start on first submission, close on track completion.
  if (solvedInTrack.length === 1) {
    await startRun(userId, level.trackId);
  }
  if (trackCompleted) {
    const openRun = await findOpenRun(userId, level.trackId);
    if (openRun) {
      await closeRun(openRun.id, new Date(), trackRow?.slug ?? "");
    }
  }

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

  // Discord announcements — fire-and-forget. Do not block on Discord.
  const announceUser = userRow?.username ?? "unknown";
  const announceTrack = trackRow?.slug ?? "unknown";
  const now = new Date();
  if (isFirstBlood) {
    void announceFirstBlood({
      username: announceUser,
      trackSlug: announceTrack,
      levelIdx: level.idx,
      levelTitle: level.title,
      points,
    });
  }
  if (isGhostGraduate && !alreadyGraduate) {
    void announceGhostGraduate({
      username: announceUser,
      serial: operativeSerial(userId, level.trackId, now, "GHST"),
    });
  }
  if (isPhantomGraduate && !alreadyPhantomGraduate) {
    void announcePhantomGraduate({
      username: announceUser,
      serial: operativeSerial(userId, level.trackId, now, "PHNM"),
    });
  }

  return {
    ok: true,
    levelIdx: level.idx,
    trackSlug: trackRow?.slug ?? "",
    points,
  };
}
