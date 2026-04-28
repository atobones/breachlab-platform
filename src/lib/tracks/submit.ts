import { eq, and, sql, gt, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  flags,
  levels,
  submissions,
  tracks,
  users,
  badges,
  specterSessionCreds,
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
import {
  specterLevelForFlag,
  specterSshPasswordFor,
  specterLevelSlugForIdx,
  specterIdxForSlug,
  sha256Hex,
} from "@/lib/specter/flags";

// Specter ephemeral SSH ports — each level binds its own listener on the
// orchestrator. Sync with breachlab-specter/orchestrator/start.sh.
const SPECTER_SSH_PORTS: Record<string, number> = {
  "paper-trail": 2230,
  "search-operator": 2231,
  "code-hunter": 2232,
  "js-recon": 2233,
};
const SPECTER_SSH_HOST = "204.168.229.209";
// Mirrors the Linux user inside each ephemeral image (specter0..3).
function specterSshUserForIdx(idx: number): string {
  return `specter${idx}`;
}

// Minimum seconds between consecutive submissions from the same user.
// Rationale: galile0 (2026-04-23) submitted Ghost L14→L22 in 40 seconds
// (~4.4s/flag) and Phantom L1→L4 in 14 seconds (~3.5s/flag) after grabbing
// all flags out of the public `canonical-flags.ts` mirror (now removed).
// A 3s floor doesn't touch legit rapid clears (slowest observed legit gap
// between sequential captures is ~3.4s) but caps scripted replay to an
// order of magnitude slower than the attack.
const SUBMIT_MIN_SPACING_MS = 3_000;

export type SpecterNextCreds = {
  // Bootstrap creds for the next Specter level. Returned in the /submit
  // response so the post-submit UI can show "next ssh + password".
  level: string;          // slug, e.g. "search-operator"
  levelIdx: number;       // 0..3
  sshUser: string;        // specter1
  sshHost: string;        // 204.168.229.209
  sshPort: number;        // 2231
  password: string;       // bl_<32 hex> — the just-submitted player flag
  expiresAt: string;      // ISO timestamp (24h ahead)
};

export type SubmitResult =
  | {
      ok: true;
      levelIdx: number;
      trackSlug: string;
      points: number;
      specterNext?: SpecterNextCreds;
    }
  | { ok: false; error: string };

export async function submitFlag(
  userId: string,
  rawFlag: string,
  sourceIp: string | null
): Promise<SubmitResult> {
  // Defense-in-depth email-verification gate. The action layer also
  // checks but the lib enforces too so any future caller can't bypass.
  // Caught the 2026-04-26 spam-reg pattern (3 accounts created with
  // @example.com / RFC 2606 reserved, fully able to submit and score).
  const [verifyRow] = await db
    .select({ verified: users.emailVerified })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!verifyRow || !verifyRow.verified) {
    return {
      ok: false,
      error: "Verify your email before submitting flags.",
    };
  }

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

  // Rate limit: reject if this user submitted anything within the floor.
  // Checked AFTER shape validation so malformed flags don't count against
  // the cooldown (player debugging their own submission shouldn't be
  // penalised). Checked BEFORE the flag hash lookup so a replay of a
  // stolen flag list can't burn DB cycles.
  const [lastSub] = await db
    .select({ submittedAt: submissions.submittedAt })
    .from(submissions)
    .where(eq(submissions.userId, userId))
    .orderBy(desc(submissions.submittedAt))
    .limit(1);
  if (lastSub) {
    const elapsed = Date.now() - new Date(lastSub.submittedAt).getTime();
    if (elapsed < SUBMIT_MIN_SPACING_MS) {
      const wait = Math.ceil((SUBMIT_MIN_SPACING_MS - elapsed) / 1000);
      return {
        ok: false,
        error: `Slow down. Wait ${wait}s before submitting again.`,
      };
    }
  }

  // Two-stage lookup: canonical flags table (Ghost/Phantom static flags),
  // then Specter HMAC fallthrough (per-player flags, no DB row exists —
  // the flag is recomputed from the player's own user_id + level slug).
  const flagHash = await hashToken(normalized);
  const [flagRow] = await db
    .select()
    .from(flags)
    .where(eq(flags.flagHash, flagHash))
    .limit(1);

  let level: typeof levels.$inferSelect | undefined;
  let trackRow: { slug: string } | undefined;
  let specterMatchedSlug: string | null = null;

  if (flagRow) {
    [level] = await db
      .select()
      .from(levels)
      .where(eq(levels.id, flagRow.levelId))
      .limit(1);
    if (!level) return { ok: false, error: "Unknown flag" };
    [trackRow] = await db
      .select({ slug: tracks.slug })
      .from(tracks)
      .where(eq(tracks.id, level.trackId))
      .limit(1);
  } else {
    specterMatchedSlug = specterLevelForFlag(userId, normalized);
    if (!specterMatchedSlug) return { ok: false, error: "Unknown flag" };
    const idx = specterIdxForSlug(specterMatchedSlug);
    const [specterTrack] = await db
      .select()
      .from(tracks)
      .where(eq(tracks.slug, "specter"))
      .limit(1);
    if (!specterTrack) return { ok: false, error: "Unknown flag" };
    [level] = await db
      .select()
      .from(levels)
      .where(and(eq(levels.trackId, specterTrack.id), eq(levels.idx, idx)))
      .limit(1);
    if (!level) return { ok: false, error: "Unknown flag" };
    trackRow = { slug: "specter" };
  }

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

  // Strict chain integrity for ALL tracks. Out-of-order submissions are
  // rejected outright with a "Locked" message — no 0-pts admit row, no
  // reconcile cascade. The earlier "points-unlock-with-chain" policy
  // (record 0-pts, promote later) was empirically a flag-paste cheat
  // vector: a leaked Discord/Telegram flag list submitted in any order
  // turned every level into a free promotion as soon as the player
  // honestly cleared L0 (cascade walked up and converted every 0-pts
  // admit to base points). Surfaced 2026-04-27 when admin saw player
  // `sukun` with a 0-pts ghost/L20 between honest L1 and L2.
  //
  // The deeper structural fix is per-player flags (HMAC-derived, see
  // BreachLab Killer Features Per-Player Flags brainstorm). This change
  // is the immediate gate.
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

  if (!chainIntact) {
    const trackSlug = trackRow?.slug ?? "track";
    return {
      ok: false,
      error: `Locked. Solve ${trackSlug}/${level.idx - 1} before submitting ${trackSlug}/${level.idx}.`,
    };
  }

  // First-blood is the first chain-intact submission ever recorded for
  // this level. Now that out-of-order captures are rejected outright,
  // any pointsAwarded > 0 row counts as a chain-intact prior.
  const anyChainIntactPrior = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.levelId, level.id),
        gt(submissions.pointsAwarded, 0),
      ),
    )
    .limit(1);
  const isFirstBlood = anyChainIntactPrior.length === 0;

  const points = computeAwardedPoints(level, isFirstBlood);
  await db.insert(submissions).values({
    userId,
    levelId: level.id,
    pointsAwarded: points,
    sourceIp: sourceIp ?? undefined,
  });

  // Reconcile cascade was removed 2026-04-27 alongside the strict-chain
  // change above. The cascade existed to retroactively promote 0-pts
  // out-of-order admits to full points once the chain caught up. With
  // out-of-order admits now rejected, there are no future 0-pts rows
  // to promote, and promoting historical pre-strict 0-pts rows would
  // hand free points to the very flag-paste behaviour the new gate
  // closes. Existing 0-pts records stay as audit data only.

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
    .select({
      username: users.username,
      isHallOfFame: users.isHallOfFame,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  liveBus.publish({
    type: "submission",
    at: new Date().toISOString(),
    username: userRow?.username ?? "unknown",
    isHallOfFame: userRow?.isHallOfFame ?? false,
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

  // Specter chain: issue next-level credentials. Boss design lock
  // 2026-04-28: flag and SSH password are SEPARATE strings (no OTW-
  // style "flag = next password"). Both per-player, both HMAC-derived,
  // but with different namespaces (`:ssh` suffix on the password
  // derivation). Platform reveals the next-level SSH password here on
  // first solve; player saves it (deterministic, can be re-derived
  // server-side any time, but never shown a second time on submit).
  let specterNext: SpecterNextCreds | undefined;
  if (specterMatchedSlug) {
    const nextIdx = level.idx + 1;
    const nextSlug = specterLevelSlugForIdx(nextIdx);
    if (nextSlug) {
      const nextPassword = specterSshPasswordFor(userId, nextSlug);
      const nextPwHash = sha256Hex(nextPassword);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db
        .insert(specterSessionCreds)
        .values({
          userId,
          nextLevel: nextSlug,
          passwordSha256: nextPwHash,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: [specterSessionCreds.userId, specterSessionCreds.nextLevel],
          set: {
            passwordSha256: nextPwHash,
            expiresAt,
            issuedAt: new Date(),
          },
        });
      specterNext = {
        level: nextSlug,
        levelIdx: nextIdx,
        sshUser: `specter${nextIdx}`,
        sshHost: SPECTER_SSH_HOST,
        sshPort: SPECTER_SSH_PORTS[nextSlug] ?? 0,
        password: nextPassword,
        expiresAt: expiresAt.toISOString(),
      };
    }
  }

  return {
    ok: true,
    levelIdx: level.idx,
    trackSlug: trackRow?.slug ?? "",
    points,
    ...(specterNext ? { specterNext } : {}),
  };
}
