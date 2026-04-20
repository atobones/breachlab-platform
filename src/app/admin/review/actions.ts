"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { badges, speedrunRuns, tracks } from "@/lib/db/schema";
import { requireAdminWithTotp } from "@/lib/admin/guards";
import { getTopSpeedruns } from "@/lib/speedrun/queries";
import { recordAudit } from "@/lib/admin/audit";

type Result = { ok: true } | { ok: false; error: string };

// approveRun/rejectRun mutate leaderboard state (speedrun_top10 badge
// insertion, run status) so they need the same fresh-TOTP gate the
// user/sponsor mutations already use. A stolen admin cookie otherwise
// lets an attacker rubber-stamp suspicious runs and hand out badges.
// Reported 2026-04-20 by post-incident audit.
export async function approveRun(
  runId: string,
  totpCode: string,
): Promise<Result> {
  const check = await requireAdminWithTotp(totpCode);
  if ("error" in check) return { ok: false, error: check.error };
  const admin = check.actor;
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

  if (!updated) {
    await recordAudit({
      actor: admin,
      action: "speedrun.approve",
      metadata: { runId, note: "run not found" },
    });
    return { ok: false, error: "run not found" };
  }

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

  await recordAudit({
    actor: admin,
    action: "speedrun.approve",
    metadata: { runId },
  });

  revalidatePath("/admin/review");
  revalidatePath("/leaderboard/speedrun");
  return { ok: true };
}

export async function rejectRun(
  runId: string,
  totpCode: string,
): Promise<Result> {
  const check = await requireAdminWithTotp(totpCode);
  if ("error" in check) return { ok: false, error: check.error };
  const admin = check.actor;
  await db
    .update(speedrunRuns)
    .set({
      reviewStatus: "rejected",
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    })
    .where(eq(speedrunRuns.id, runId));
  await recordAudit({
    actor: admin,
    action: "speedrun.reject",
    metadata: { runId },
  });
  revalidatePath("/admin/review");
  revalidatePath("/leaderboard/speedrun");
  return { ok: true };
}
