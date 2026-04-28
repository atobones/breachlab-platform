import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { specterPlayerTokens } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";
import { generateToken, hashToken } from "@/lib/auth/tokens";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Player calls this from their dashboard to get a Specter L0 bootstrap
// token. The plaintext token is returned ONCE — hash is what we store.
// Player exports BL_TOKEN=<plaintext> on the L0 ephemeral before running
// /opt/specter-verify so the oracle can resolve them to a user_id and
// mint a per-player flag.
//
// Multiple tokens per user is fine; old ones simply expire after 7 days.
// Lost-token recovery is "click the button again". No revocation surface
// needed yet — flags are HMAC-derived and SSH passwords for L1+ come from
// the chain, so a leaked L0 token only lets an attacker post the verifier
// from the leaker's perspective, which gives them THEIR own per-player
// flag (still useless to anyone else).
export async function POST() {
  const { user } = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const token = generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.insert(specterPlayerTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return NextResponse.json({
    token,
    expiresAt: expiresAt.toISOString(),
  });
}
