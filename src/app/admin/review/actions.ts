"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { badges, speedrunRuns, tracks } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";
import { getTopSpeedruns } from "@/lib/speedrun/queries";

async function requireAdmin() {
  const { user } = await getCurrentSession();
  if (!user || !user.isAdmin || !user.totpEnabled) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function approveRun(runId: string): Promise<void> {
  const admin = await requireAdmin();
  const now = new Date();

  const [updated] = await db
    .update(speedrunRuns)
    .set({
      reviewStatus: "approved",
      reviewedBy: admin.id,
      reviewedAt: now,
    })
    .where(eq(speedrunRuns.id, runId))
    .returning();

  if (!updated) return;

  const [track] = await db
    .select({ slug: tracks.slug })
    .from(tracks)
    .where(eq(tracks.id, updated.trackId))
    .limit(1);

  if (track && updated.totalSeconds !== null) {
    const top = await getTopSpeedruns(track.slug, 10);
    const inTop10 = top.some(
      (r) => Number(r.totalSeconds) === Number(updated.totalSeconds),
    );
    if (inTop10) {
      const existing = await db
        .select({ id: badges.id })
        .from(badges)
        .where(
          and(
            eq(badges.userId, updated.userId),
            eq(badges.kind, "speedrun_top10"),
            eq(badges.refId, updated.trackId),
          ),
        )
        .limit(1);
      if (existing.length === 0) {
        await db.insert(badges).values({
          userId: updated.userId,
          kind: "speedrun_top10",
          refId: updated.trackId,
        });
      }
    }
  }

  revalidatePath("/admin/review");
  revalidatePath("/leaderboard/speedrun");
}

export async function rejectRun(runId: string): Promise<void> {
  const admin = await requireAdmin();
  await db
    .update(speedrunRuns)
    .set({
      reviewStatus: "rejected",
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    })
    .where(eq(speedrunRuns.id, runId));
  revalidatePath("/admin/review");
  revalidatePath("/leaderboard/speedrun");
}
