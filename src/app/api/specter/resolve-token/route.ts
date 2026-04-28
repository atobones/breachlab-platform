import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { specterPlayerTokens } from "@/lib/db/schema";
import { hashToken, safeBearerMatch } from "@/lib/auth/tokens";

// L0 verifier path. The L0 ephemeral is a shared bootstrap (everyone uses
// the same SSH password to enter — public CTF entry point), so the oracle
// can't bind a verify call to a player by SSH PAM. Instead the player
// pulls a one-shot token from their dashboard, exports BL_TOKEN inside L0,
// runs /opt/specter-verify which posts BL_TOKEN to the oracle, oracle
// calls this endpoint, we hash + look up + return user_id.
//
// Token rows expire 7 days after issue. Multiple active tokens per user
// is fine — each resolves to the same user_id.
export async function POST(req: Request) {
  const expected = process.env.SPECTER_ORACLE_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "SPECTER_ORACLE_SECRET not configured" },
      { status: 500 }
    );
  }
  if (!safeBearerMatch(req.headers.get("authorization"), expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { token } = body;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const tokenHash = await hashToken(token);
  const [row] = await db
    .select({ userId: specterPlayerTokens.userId })
    .from(specterPlayerTokens)
    .where(
      and(
        eq(specterPlayerTokens.tokenHash, tokenHash),
        gt(specterPlayerTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true, player_id: row.userId });
}
