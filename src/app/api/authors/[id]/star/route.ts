import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { authorStars, users } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

async function authorExists(id: string): Promise<boolean> {
  const row = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, id), eq(users.isFeaturedAuthor, true)))
    .limit(1);
  return row.length > 0;
}

export async function POST(_req: Request, ctx: Ctx) {
  const { user } = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const { id } = await ctx.params;
  if (!(await authorExists(id))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await db
    .insert(authorStars)
    .values({ authorId: id, userId: user.id })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { user } = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const { id } = await ctx.params;
  if (!(await authorExists(id))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await db
    .delete(authorStars)
    .where(and(eq(authorStars.authorId, id), eq(authorStars.userId, user.id)));

  return NextResponse.json({ ok: true });
}
