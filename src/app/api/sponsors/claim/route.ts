import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sponsors } from "@/lib/sponsors/schema";
import { getCurrentSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const { user } = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const token = body.token as string;
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }

  const [sponsor] = await db
    .select()
    .from(sponsors)
    .where(eq(sponsors.claimToken, token))
    .limit(1);

  // Use a single generic error for both "no such token" and "token already
  // claimed" so an attacker can't enumerate valid claim tokens by diffing
  // 404 vs 409 responses. Rate-limit on /api/sponsors/claim is already 10/min
  // (auth group in middleware) so brute-force is bounded too.
  if (!sponsor || sponsor.userId) {
    return NextResponse.json({ error: "invalid or already-claimed token" }, { status: 400 });
  }

  await db
    .update(sponsors)
    .set({ userId: user.id, claimToken: null })
    .where(eq(sponsors.id, sponsor.id));

  return NextResponse.json({ ok: true, tier: sponsor.tierCode });
}
