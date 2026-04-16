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

  if (!sponsor) {
    return NextResponse.json({ error: "invalid token" }, { status: 404 });
  }

  if (sponsor.userId) {
    return NextResponse.json({ error: "already claimed" }, { status: 409 });
  }

  await db
    .update(sponsors)
    .set({ userId: user.id, claimToken: null })
    .where(eq(sponsors.id, sponsor.id));

  return NextResponse.json({ ok: true, tier: sponsor.tierCode });
}
