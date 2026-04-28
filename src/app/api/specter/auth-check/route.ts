import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { specterSessionCreds } from "@/lib/db/schema";
import { safeBearerMatch } from "@/lib/auth/tokens";

// Oracle (specter-mgmt) calls this from its PAM proxy when a player ssh's
// into a Specter L1+ ephemeral. The oracle has already received the raw
// password from PAM and hashed it; we look up the row inserted by /submit
// when the player solved the previous level. No row → 401 → PAM denies.
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

  let body: { level?: string; password_sha256?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { level, password_sha256 } = body;
  if (!level || !password_sha256 || typeof password_sha256 !== "string") {
    return NextResponse.json(
      { error: "level and password_sha256 required" },
      { status: 400 }
    );
  }

  const [row] = await db
    .select({ userId: specterSessionCreds.userId })
    .from(specterSessionCreds)
    .where(
      and(
        eq(specterSessionCreds.nextLevel, level),
        eq(specterSessionCreds.passwordSha256, password_sha256),
        gt(specterSessionCreds.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true, player_id: row.userId });
}
