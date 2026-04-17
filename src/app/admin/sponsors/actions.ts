"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sponsors } from "@/lib/sponsors/schema";
import { getCurrentSession } from "@/lib/auth/session";

type Result = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<boolean> {
  const { user } = await getCurrentSession();
  return Boolean(user?.isAdmin && user.totpEnabled);
}

export async function endSponsorship(sponsorId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };
  await db
    .update(sponsors)
    .set({ endedAt: sql`now()` })
    .where(eq(sponsors.id, sponsorId));
  revalidatePath("/admin/sponsors");
  return { ok: true };
}

export async function deleteSponsor(sponsorId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "unauthorized" };
  await db.delete(sponsors).where(eq(sponsors.id, sponsorId));
  revalidatePath("/admin/sponsors");
  return { ok: true };
}
