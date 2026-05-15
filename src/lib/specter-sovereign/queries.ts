/**
 * Server-side queries for the L14 Specter Sovereign meta-game.
 *
 * Surfaces hidden state to the platform shell:
 *   - has this user earned a Specter cert? (subtle `whoami` hint trigger)
 *   - is this user the Sovereign / mystery-solved?
 *   - has anyone globally claimed Sovereign?
 *   - if so, who?
 */
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, badges } from "@/lib/db/schema";

export type SovereignContext = {
  /** User finished L13 (carries Specter Analyst cert). Drives `whoami` hint. */
  hasSpecterCert: boolean;
  /** 1 = Sovereign, 2+ = Mystery-Solved, null = not solved by this user. */
  mySovereignRank: number | null;
  /** Anyone globally is rank=1 — drives haze-disappear + banner-update. */
  claimedGlobally: boolean;
  /** The rank=1 user's username, for vignette + banner copy. */
  sovereignUsername: string | null;
  /** When the rank=1 user solved, ISO timestamp, for vignette copy. */
  sovereignClaimedAt: string | null;
};

const EMPTY: SovereignContext = {
  hasSpecterCert: false,
  mySovereignRank: null,
  claimedGlobally: false,
  sovereignUsername: null,
  sovereignClaimedAt: null,
};

export async function loadSovereignContext(
  userId: string | null,
): Promise<SovereignContext> {
  // Always fetch global Sovereign state (haze / banner depends on this
  // for guests too — they see the haze even when not logged in).
  const sovereignRow = await db
    .select({
      username: users.username,
      solvedAt: users.specterSovereignSolvedAt,
    })
    .from(users)
    .where(eq(users.specterSovereignRank, 1))
    .limit(1);
  const sov = sovereignRow[0];
  const globalState = {
    claimedGlobally: !!sov,
    sovereignUsername: sov?.username ?? null,
    sovereignClaimedAt: sov?.solvedAt?.toISOString() ?? null,
  };

  if (!userId) return { ...EMPTY, ...globalState };

  // Per-user state: has Specter cert + own Sovereign rank.
  const [meRow, certRow] = await Promise.all([
    db
      .select({
        rank: users.specterSovereignRank,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({ id: badges.id })
      .from(badges)
      .where(and(eq(badges.userId, userId), eq(badges.kind, "specter_graduate")))
      .limit(1),
  ]);

  return {
    hasSpecterCert: certRow.length > 0,
    mySovereignRank: meRow[0]?.rank ?? null,
    ...globalState,
  };
}
