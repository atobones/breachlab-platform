/**
 * Recompute `submissions.points_awarded` for every existing submission
 * under the Option H policy (points and first-blood land only when the
 * chain up to the submitted level is intact for the submitting user at
 * the moment of submission).
 *
 * What this script does:
 *   1. Load every submission, level, and track, joined for context.
 *   2. Replay submissions in chronological order.
 *      - chainIntact at moment of submit = (idx === 0) OR the user
 *        already had a submission for idx - 1 on the same track at an
 *        earlier submittedAt.
 *      - firstBlood goes to the first chain-intact submitter per level.
 *        Out-of-order captures (chain broken) never consume FB.
 *      - newPoints = chainIntact ? base + (fb ? fbBonus : 0) : 0.
 *   3. Reconcile pass: if the user later filled the missing prior
 *      level(s), out-of-order captures below their current contiguous
 *      max get promoted from 0 to level.pointsBase. FB is NOT
 *      retroactively reassigned — the honest first-blood moment
 *      already passed.
 *   4. Diff against the current values and apply updates.
 *
 * Mode:
 *   DRY_RUN=1 npx tsx scripts/backfill-chain-integrity.ts   # preview only
 *   APPLY=1   npx tsx scripts/backfill-chain-integrity.ts   # write changes
 *
 * Usage against prod via SSH tunnel (mirror of sync-flags.ts):
 *   ssh -L 54321:127.0.0.1:5432 root@<host>
 *   DATABASE_URL=postgres://breachlab:<pw>@127.0.0.1:54321/breachlab \
 *     DRY_RUN=1 npx tsx scripts/backfill-chain-integrity.ts
 */
import { asc, eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { levels, submissions, tracks, users } from "../src/lib/db/schema";

type LevelInfo = {
  id: string;
  trackId: string;
  idx: number;
  pointsBase: number;
  pointsFirstBloodBonus: number;
};

type SubRow = {
  id: string;
  userId: string;
  levelId: string;
  pointsAwarded: number;
  submittedAt: Date;
};

async function main() {
  const dryRun = process.env.APPLY !== "1";
  const skipUsers = (process.env.SKIP_USERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(
    dryRun
      ? "[dry-run] no writes will be performed — set APPLY=1 to persist."
      : "[apply] will UPDATE submissions.points_awarded in place.",
  );
  if (skipUsers.length > 0) {
    console.log(
      `[skip] these users' submissions will be left untouched: ${skipUsers.join(", ")}`,
    );
  }

  // Load levels
  const levelRows = await db
    .select({
      id: levels.id,
      trackId: levels.trackId,
      idx: levels.idx,
      pointsBase: levels.pointsBase,
      pointsFirstBloodBonus: levels.pointsFirstBloodBonus,
    })
    .from(levels);
  const levelById = new Map<string, LevelInfo>();
  const levelByTrackIdx = new Map<string, LevelInfo>(); // `${trackId}:${idx}` → level
  for (const l of levelRows) {
    levelById.set(l.id, l);
    levelByTrackIdx.set(`${l.trackId}:${l.idx}`, l);
  }

  // Track slugs for reporting
  const trackRows = await db.select({ id: tracks.id, slug: tracks.slug }).from(tracks);
  const trackSlug = new Map(trackRows.map((t) => [t.id, t.slug]));

  // Usernames for reporting
  const userRows = await db.select({ id: users.id, username: users.username }).from(users);
  const usernameById = new Map(userRows.map((u) => [u.id, u.username]));

  // Load all submissions oldest-first
  const subRows: SubRow[] = await db
    .select({
      id: submissions.id,
      userId: submissions.userId,
      levelId: submissions.levelId,
      pointsAwarded: submissions.pointsAwarded,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .orderBy(asc(submissions.submittedAt));

  console.log(
    `loaded ${subRows.length} submissions, ${levelRows.length} levels, ${trackRows.length} tracks, ${userRows.length} users.`,
  );

  // Replay state.
  //   userSolved       — all idxs submitted (used by reconcile pass for
  //                      contiguity from 0).
  //   userChainIntact  — only idxs the user solved *with an intact chain*
  //                      at the moment of submit. Used to decide whether
  //                      the NEXT submit is chain-intact. Mirror of the
  //                      submit.ts `chainIntact` fix (a 0-point out-of-order
  //                      capture of idx N must NOT satisfy the chain check
  //                      for idx N+1 — otherwise the player can walk
  //                      submissions backwards and first-blood everything).
  const userSolved = new Map<string, Map<string, Set<number>>>();
  const userChainIntact = new Map<string, Map<string, Set<number>>>();
  const firstBloodAwarded = new Map<string, boolean>(); // levelId → true once awarded
  const newPointsBySubId = new Map<string, number>(); // the H-correct points

  for (const sub of subRows) {
    const lvl = levelById.get(sub.levelId);
    if (!lvl) {
      console.warn(`orphaned submission ${sub.id} — no level row, skipping.`);
      newPointsBySubId.set(sub.id, sub.pointsAwarded);
      continue;
    }
    const userMap = userSolved.get(sub.userId) ?? new Map<string, Set<number>>();
    const trackSet = userMap.get(lvl.trackId) ?? new Set<number>();
    const userIntactMap =
      userChainIntact.get(sub.userId) ?? new Map<string, Set<number>>();
    const intactSet = userIntactMap.get(lvl.trackId) ?? new Set<number>();

    const chainIntact = lvl.idx === 0 || intactSet.has(lvl.idx - 1);
    const isFirstBlood = chainIntact && !firstBloodAwarded.get(lvl.id);

    const base = lvl.pointsBase ?? 0;
    const fb = lvl.pointsFirstBloodBonus ?? 0;
    const newPoints = chainIntact ? base + (isFirstBlood ? fb : 0) : 0;

    newPointsBySubId.set(sub.id, newPoints);
    if (isFirstBlood) firstBloodAwarded.set(lvl.id, true);

    trackSet.add(lvl.idx);
    userMap.set(lvl.trackId, trackSet);
    userSolved.set(sub.userId, userMap);

    if (chainIntact) {
      intactSet.add(lvl.idx);
      userIntactMap.set(lvl.trackId, intactSet);
      userChainIntact.set(sub.userId, userIntactMap);
    }
  }

  // Reconcile pass: any 0-point submission where the user's current
  // contiguous chain from 0 now includes that level's idx gets promoted
  // to pointsBase. FB stays where it was assigned during replay.
  for (const [uid, tracksMap] of userSolved) {
    for (const [tid, idxSet] of tracksMap) {
      // Find max contiguous from 0
      let maxContig = -1;
      while (idxSet.has(maxContig + 1)) maxContig++;
      if (maxContig < 0) continue;

      for (const sub of subRows) {
        if (sub.userId !== uid) continue;
        const lvl = levelById.get(sub.levelId);
        if (!lvl || lvl.trackId !== tid) continue;
        if (lvl.idx > maxContig) continue;
        const cur = newPointsBySubId.get(sub.id) ?? 0;
        if (cur === 0) {
          newPointsBySubId.set(sub.id, lvl.pointsBase ?? 0);
        }
      }
    }
  }

  // Diff against stored values
  type Change = {
    subId: string;
    username: string;
    trackSlug: string;
    idx: number;
    from: number;
    to: number;
  };
  const changes: Change[] = [];
  for (const sub of subRows) {
    const newPts = newPointsBySubId.get(sub.id);
    if (newPts === undefined) continue;
    if (newPts === sub.pointsAwarded) continue;
    const lvl = levelById.get(sub.levelId);
    if (!lvl) continue;
    changes.push({
      subId: sub.id,
      username: usernameById.get(sub.userId) ?? sub.userId.slice(0, 8),
      trackSlug: trackSlug.get(lvl.trackId) ?? "unknown",
      idx: lvl.idx,
      from: sub.pointsAwarded,
      to: newPts,
    });
  }

  // Per-user point-total delta for clearer reporting
  const deltaByUser = new Map<string, number>();
  for (const c of changes) {
    deltaByUser.set(c.username, (deltaByUser.get(c.username) ?? 0) + (c.to - c.from));
  }

  console.log(`\n=== planned changes: ${changes.length} row(s) ===`);
  if (changes.length === 0) {
    console.log("nothing to update — submissions already match Option H.");
  } else {
    for (const c of changes) {
      console.log(
        `  ${c.username.padEnd(20)} ${c.trackSlug.padEnd(8)} L${String(c.idx).padStart(2)} : ${String(c.from).padStart(5)} → ${String(c.to).padStart(5)}`,
      );
    }
    console.log("\n=== per-user point delta ===");
    const sorted = [...deltaByUser.entries()].sort((a, b) => a[1] - b[1]);
    for (const [name, d] of sorted) {
      console.log(`  ${name.padEnd(20)} ${d >= 0 ? "+" : ""}${d}`);
    }
  }

  if (dryRun) {
    console.log("\n[dry-run] no writes. Re-run with APPLY=1 to persist.");
    return;
  }

  const skipSet = new Set(skipUsers);
  const toApply = changes.filter((c) => !skipSet.has(c.username));
  const skipped = changes.length - toApply.length;
  console.log(
    `\n[apply] writing ${toApply.length} updates (${skipped} skipped by SKIP_USERS)...`,
  );
  for (const c of toApply) {
    await db
      .update(submissions)
      .set({ pointsAwarded: c.to })
      .where(eq(submissions.id, c.subId));
  }
  console.log("[apply] done.");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
