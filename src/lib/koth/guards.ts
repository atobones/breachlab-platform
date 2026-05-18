import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { kothGuards, kothRounds, users } from "@/lib/db/schema";
import { postKothGuardClaimedToDiscord } from "@/lib/koth/discord";

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
