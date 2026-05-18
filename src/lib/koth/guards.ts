import { and, desc, eq, gt, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  kothEvents,
  kothGuardLockdowns,
  kothGuards,
  kothPaths,
  kothRounds,
  users,
} from "@/lib/db/schema";
import {
  postKothGuardClaimedToDiscord,
  postKothGuardLockdownToDiscord,
} from "@/lib/koth/discord";

// Guard Lockdown — single token per round per guard. 3-minute
// window during which the oracle refuses to score crown_taken events
// via the chosen primitive. See migration 0031 + the crown_taken
// event handler.
export const LOCKDOWN_WINDOW_SEC = 180;

// Crown Wars — King's Guard helpers.
//
// One guard per round, FCFS. The guard claim is independent of slot
// status — even players who aren't enlisted in the arena can take the
// guard role from outside (signed-in account is enough). Guard scores
// half of the king's active-hold seconds per minute (computed by the
// scoring engine).

export async function activeRoundId(): Promise<string | null> {
  const r = await db
    .select({ id: kothRounds.id })
    .from(kothRounds)
    .where(eq(kothRounds.status, "active"))
    .orderBy(desc(kothRounds.startedAt))
    .limit(1);
  return r[0]?.id ?? null;
}

export type GuardRow = {
  userId: string;
  username: string | null;
  claimedAt: Date;
};

export async function getGuardForRound(
  roundId: string,
): Promise<GuardRow | null> {
  const r = await db
    .select({
      userId: kothGuards.userId,
      username: users.username,
      claimedAt: kothGuards.claimedAt,
    })
    .from(kothGuards)
    .leftJoin(users, eq(users.id, kothGuards.userId))
    .where(eq(kothGuards.roundId, roundId))
    .limit(1);
  return r[0] ?? null;
}

export async function isUserGuardForRound(
  userId: string,
  roundId: string,
): Promise<boolean> {
  const r = await db
    .select({ id: kothGuards.id })
    .from(kothGuards)
    .where(
      and(eq(kothGuards.roundId, roundId), eq(kothGuards.userId, userId)),
    )
    .limit(1);
  return r.length > 0;
}

export async function claimGuard(
  userId: string,
  roundId: string,
): Promise<
  | { ok: true }
  | { ok: false; error: string; existing?: GuardRow | null }
> {
  try {
    await db.insert(kothGuards).values({ userId, roundId });
    // Fire-and-forget Discord announce — never block the action on
    // Discord-side trouble.
    try {
      const u = await db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      const uname = u[0]?.username;
      if (uname) {
        postKothGuardClaimedToDiscord({ guardUsername: uname });
      }
    } catch {
      // ignore
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // FCFS — the partial unique index on round_id alone trips when
    // someone else claimed first. Surface who got it, gracefully.
    if (msg.includes("koth_guards_one_per_round")) {
      const existing = await getGuardForRound(roundId);
      return {
        ok: false,
        error:
          existing && existing.username
            ? `the guard slot was already claimed by @${existing.username}.`
            : "the guard slot was already claimed by another operator.",
        existing,
      };
    }
    return { ok: false, error: "guard claim failed — try again." };
  }
}

// "Has the round started?" — defined as: there's been at least one
// crown_taken event in this round. Guard claim is gated on this so
// the role is only active during live play (no claiming a slot
// before anyone has even taken crown). See Boss feedback 2026-05-18
// PM and the page render in /battles/koth.
export async function hasFirstCrownBeenTaken(roundId: string): Promise<boolean> {
  const r = await db
    .select({ id: kothEvents.id })
    .from(kothEvents)
    .where(
      and(eq(kothEvents.roundId, roundId), eq(kothEvents.kind, "crown_taken")),
    )
    .limit(1);
  return r.length > 0;
}

export type LockdownRow = {
  id: string;
  pathSlug: string;
  pathName: string | null;
  guardUserId: string;
  guardUsername: string | null;
  startedAt: Date;
  expiresAt: Date;
  blockedCount: number;
};

// All currently-active lockdowns for a round (expires_at > now()).
export async function getActiveLockdowns(roundId: string): Promise<LockdownRow[]> {
  const rows = await db
    .select({
      id: kothGuardLockdowns.id,
      pathSlug: kothGuardLockdowns.pathSlug,
      pathName: kothPaths.name,
      guardUserId: kothGuardLockdowns.guardUserId,
      guardUsername: users.username,
      startedAt: kothGuardLockdowns.startedAt,
      expiresAt: kothGuardLockdowns.expiresAt,
      blockedCount: kothGuardLockdowns.blockedCount,
    })
    .from(kothGuardLockdowns)
    .leftJoin(users, eq(users.id, kothGuardLockdowns.guardUserId))
    .leftJoin(kothPaths, eq(kothPaths.slug, kothGuardLockdowns.pathSlug))
    .where(
      and(
        eq(kothGuardLockdowns.roundId, roundId),
        gt(kothGuardLockdowns.expiresAt, sql`NOW()`),
      ),
    )
    .orderBy(desc(kothGuardLockdowns.startedAt));
  return rows;
}

// Has THIS guard already used their token for THIS round?
export async function guardHasUsedLockdown(
  roundId: string,
  guardUserId: string,
): Promise<boolean> {
  const r = await db
    .select({ id: kothGuardLockdowns.id })
    .from(kothGuardLockdowns)
    .where(
      and(
        eq(kothGuardLockdowns.roundId, roundId),
        eq(kothGuardLockdowns.guardUserId, guardUserId),
      ),
    )
    .limit(1);
  return r.length > 0;
}

// Place a lockdown. Validates: caller must be the current guard +
// hasn't already used their token + the path slug is real + game
// has started. Returns the persisted row.
export async function placeLockdown(
  roundId: string,
  guardUserId: string,
  pathSlug: string,
): Promise<
  | { ok: true; expiresAt: Date }
  | { ok: false; error: string }
> {
  // Guard must hold the slot.
  const guard = await getGuardForRound(roundId);
  if (!guard || guard.userId !== guardUserId) {
    return { ok: false, error: "you are not the guard for this round." };
  }
  // Game must have started.
  const started = await hasFirstCrownBeenTaken(roundId);
  if (!started) {
    return {
      ok: false,
      error: "the game hasn't started — wait for the first crown to be taken.",
    };
  }
  // Path slug must exist in catalog.
  const slugRow = await db
    .select({ slug: kothPaths.slug })
    .from(kothPaths)
    .where(eq(kothPaths.slug, pathSlug))
    .limit(1);
  if (slugRow.length === 0) {
    return { ok: false, error: `unknown primitive: ${pathSlug}` };
  }
  // One token per round per guard.
  const expiresAt = new Date(Date.now() + LOCKDOWN_WINDOW_SEC * 1000);
  try {
    await db.insert(kothGuardLockdowns).values({
      roundId,
      guardUserId,
      pathSlug,
      expiresAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Unique index from migration 0031.
    if (msg.includes("koth_guard_lockdowns_one_per_round_guard")) {
      return {
        ok: false,
        error: "you've already used your lockdown this round.",
      };
    }
    return { ok: false, error: "lockdown failed — try again." };
  }
  // Fire-and-forget Discord announce.
  try {
    postKothGuardLockdownToDiscord({
      guardUsername: guard.username ?? "anon",
      pathSlug,
      durationSec: LOCKDOWN_WINDOW_SEC,
    });
  } catch {
    /* ignore */
  }
  return { ok: true, expiresAt };
}

// Check whether a path is currently locked down in a round. Used by
// the crown_taken event handler in oracle ingest.
export async function isPathLockedDown(
  roundId: string,
  pathSlug: string,
): Promise<{ locked: boolean; lockdownId?: string }> {
  const rows = await db
    .select({ id: kothGuardLockdowns.id })
    .from(kothGuardLockdowns)
    .where(
      and(
        eq(kothGuardLockdowns.roundId, roundId),
        eq(kothGuardLockdowns.pathSlug, pathSlug),
        gt(kothGuardLockdowns.expiresAt, sql`NOW()`),
      ),
    )
    .orderBy(desc(kothGuardLockdowns.expiresAt))
    .limit(1);
  if (rows.length === 0) return { locked: false };
  return { locked: true, lockdownId: rows[0].id };
}

// When the oracle blocks a crown_taken, bump the lockdown's
// blocked_count so the guard sees their impact in the UI.
export async function recordLockdownBlock(lockdownId: string): Promise<void> {
  await db
    .update(kothGuardLockdowns)
    .set({ blockedCount: sql`${kothGuardLockdowns.blockedCount} + 1` })
    .where(eq(kothGuardLockdowns.id, lockdownId));
}
