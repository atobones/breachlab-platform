import { eq, and, sql, gt } from "drizzle-orm";
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

  // Points-unlock-with-chain. The platform accepts any valid flag at any
  // time (a flat-container CTF naturally surfaces flags out of order
  // during recon), but points and first-blood only land when the chain
  // up to this level is intact for this user. Out-of-order captures are
  // recorded with pointsAwarded=0 and no first-blood bonus. When the
  // player later fills in the missing prior level(s), the reconcile
  // cascade below retroactively promotes those 0-point captures to the
  // level's base points. First-blood stays attached to the moment of
  // the first chain-intact submission and is never reassigned.
  let chainIntact = level.idx === 0;
  if (!chainIntact) {
    const [prior] = await db
      .select({ id: levels.id })
      .from(levels)
      .where(
        and(eq(levels.trackId, level.trackId), eq(levels.idx, level.idx - 1)),
      )
      .limit(1);
    if (prior) {
      // Chain is intact only if the user has a *chain-intact* solve of the
      // prior level — i.e. pointsAwarded > 0. Merely having a 0-point
      // out-of-order capture on the prior level does NOT count as
      // "prior level solved", otherwise a player can submit N→N-1→...→0
      // backwards and each submit claims chainIntact because the row
      // above it exists (reported 2026-04-20: `hypee` got first_blood on
      // phantom/15 by having a 0-point phantom/14 one-shot submit).
      // Reconcile pass (below) handles the honest case where an earlier
      // 0-point capture later becomes chain-intact via fill-in.
      const priorSubmitted = await db
        .select({ id: submissions.id })
        .from(submissions)
        .where(
          and(
            eq(submissions.userId, userId),
            eq(submissions.levelId, prior.id),
            gt(submissions.pointsAwarded, 0),
          ),
        )
        .limit(1);
      chainIntact = priorSubmitted.length > 0;
    } else {
      // Defensive: if somehow there is no idx-1 row on this track,
      // do not block the submission — treat as intact.
      chainIntact = true;
    }
  }

  // First-blood is the first chain-intact submission ever recorded for
  // this level. Out-of-order captures (pointsAwarded=0) do NOT consume
  // first-blood, so an honest-chain player who solves later still gets
  // the bonus. Use pointsAwarded > 0 as the "chain-intact submission"
  // marker, since a chain-intact submit always awards at least
  // level.pointsBase.
  const anyChainIntactPrior = chainIntact
    ? await db
        .select({ id: submissions.id })
        .from(submissions)
        .where(
          and(
            eq(submissions.levelId, level.id),
            gt(submissions.pointsAwarded, 0),
          ),
        )
        .limit(1)
    : [];
  const isFirstBlood = chainIntact && anyChainIntactPrior.length === 0;

  const points = chainIntact ? computeAwardedPoints(level, isFirstBlood) : 0;
  await db.insert(submissions).values({
    userId,
    levelId: level.id,
    pointsAwarded: points,
    sourceIp: sourceIp ?? undefined,
  });

  // Reconcile cascade. If this submission made the chain intact, walk
  // upward: any existing 0-point capture on this track whose prior is
  // now solved gets promoted to level.pointsBase. First-blood is NOT
  // retroactively awarded — that moment already passed.
  if (chainIntact) {
    let walkIdx = level.idx + 1;
    // Bounded loop: tracks top out at 32 levels today. 64 is a safe cap.
    for (let guard = 0; guard < 64; guard++) {
      const [nextLevel] = await db
        .select()
        .from(levels)
        .where(
          and(eq(levels.trackId, level.trackId), eq(levels.idx, walkIdx)),
        )
        .limit(1);
      if (!nextLevel) break;
      const [nextSub] = await db
        .select({ id: submissions.id, points: submissions.pointsAwarded })
        .from(submissions)
        .where(
          and(
            eq(submissions.userId, userId),
            eq(submissions.levelId, nextLevel.id),
          ),
        )
        .limit(1);
      if (!nextSub) break;
      if (nextSub.points === 0) {
        await db
          .update(submissions)
          .set({ pointsAwarded: nextLevel.pointsBase })
          .where(eq(submissions.id, nextSub.id));
      }
      walkIdx++;
    }
  }

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

  // Graduation badges and announcements require the full chain intact
  // at the moment of the graduation submission — submitting the grad
  // flag after fishing it out of the container without clearing L0..N-1
  // does not earn the operative/master badge.
  const isGhostGraduate =
    chainIntact && trackRow?.slug === "ghost" && level.idx === 22;
  const isPhantomGraduate =
    chainIntact && trackRow?.slug === "phantom" && level.idx === 31;

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
