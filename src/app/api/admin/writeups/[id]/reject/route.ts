import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { writeups } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { user } = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });
  if (!user.isAdmin && !(user as any).isCurator) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let body: { reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.reason || body.reason.trim().length === 0) {
    return NextResponse.json({ error: "reason required" }, { status: 400 });
  }
  const { id } = await ctx.params;
  await db
    .update(writeups)
    .set({
      status: "rejected",
      reviewedAt: sql`now()`,
      reviewedBy: user.id,
      rejectionReason: body.reason.trim(),
    })
    .where(eq(writeups.id, id));
  return NextResponse.json({ ok: true });
}
