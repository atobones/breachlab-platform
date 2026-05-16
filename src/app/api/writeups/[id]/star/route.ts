import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { writeupStars } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";
import { getCommunityWriteupById } from "@/lib/community-writeups";
import {
  getCompletedLevelIdxs,
  isCommunityWriteupReadable,
} from "@/lib/writeup-access";

type Ctx = { params: Promise<{ id: string }> };

async function authorize(id: string) {
  const { user } = await getCurrentSession();
  if (!user) return { error: 401 as const, user: null };
  const writeup = await getCommunityWriteupById(id);
  if (!writeup) return { error: 404 as const, user };
  const completedLevels = await getCompletedLevelIdxs(user.id, writeup.trackSlug);
  const readable = isCommunityWriteupReadable({
    trackSlug: writeup.trackSlug,
    levelIdx: writeup.levelIdx,
    user: { id: user.id, isAdmin: user.isAdmin, isCurator: (user as any).isCurator ?? false },
    completedLevels,
  });
  if (!readable) return { error: 403 as const, user };
  return { error: null, user, writeup };
}

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const a = await authorize(id);
  if (a.error) return NextResponse.json({ error: a.error }, { status: a.error });

  await db
    .insert(writeupStars)
    .values({ writeupId: id, userId: a.user!.id })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const a = await authorize(id);
  if (a.error) return NextResponse.json({ error: a.error }, { status: a.error });

  await db
    .delete(writeupStars)
    .where(
      and(
        eq(writeupStars.writeupId, id),
        eq(writeupStars.userId, a.user!.id),
      ),
    );

  return NextResponse.json({ ok: true });
}
