"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sponsors } from "@/lib/sponsors/schema";
import { requireAdminWithTotp } from "@/lib/admin/guards";
import { recordAudit } from "@/lib/admin/audit";

type Result = { ok: true } | { ok: false; error: string };

export async function endSponsorship(
  sponsorId: string,
  totpCode: string
): Promise<Result> {
  const check = await requireAdminWithTotp(totpCode);
  if ("error" in check) return { ok: false, error: check.error };
  await db
    .update(sponsors)
    .set({ endedAt: sql`now()` })
    .where(eq(sponsors.id, sponsorId));
  await recordAudit({
    actor: check.actor,
    action: "sponsor.end",
    targetSponsorId: sponsorId,
  });
  revalidatePath("/admin/sponsors");
  return { ok: true };
}

export async function deleteSponsor(
  sponsorId: string,
  totpCode: string
): Promise<Result> {
  const check = await requireAdminWithTotp(totpCode);
  if ("error" in check) return { ok: false, error: check.error };
  await db.delete(sponsors).where(eq(sponsors.id, sponsorId));
  await recordAudit({
    actor: check.actor,
    action: "sponsor.delete",
    targetSponsorId: sponsorId,
  });
  revalidatePath("/admin/sponsors");
  return { ok: true };
}
