"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireAdminWithTotp } from "@/lib/admin/guards";
import { recordAudit } from "@/lib/admin/audit";
import { lucia } from "@/lib/auth/lucia";

type Result = { ok: true } | { ok: false; error: string };

export async function toggleUserAdmin(
  userId: string,
  nextValue: boolean,
  totpCode: string
): Promise<Result> {
  const check = await requireAdminWithTotp(totpCode);
  if ("error" in check) return { ok: false, error: check.error };
  if (check.actor.id === userId) {
    return { ok: false, error: "cannot modify your own admin flag" };
  }
  await db
    .update(users)
    .set({ isAdmin: nextValue })
    .where(eq(users.id, userId));
  await recordAudit({
    actor: check.actor,
    action: nextValue ? "user.promote" : "user.demote",
    targetUserId: userId,
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetUserTotp(
  userId: string,
  totpCode: string
): Promise<Result> {
  const check = await requireAdminWithTotp(totpCode);
  if ("error" in check) return { ok: false, error: check.error };
  if (check.actor.id === userId) {
    return { ok: false, error: "cannot reset your own TOTP" };
  }
  await db
    .update(users)
    .set({ totpSecret: null })
    .where(eq(users.id, userId));
  // Killing all sessions of a user whose 2FA was reset is mandatory —
  // otherwise existing cookies survive a forced re-enrolment.
  await lucia.invalidateUserSessions(userId);
  await recordAudit({
    actor: check.actor,
    action: "user.reset_totp",
    targetUserId: userId,
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function forceEmailReverify(
  userId: string,
  totpCode: string
): Promise<Result> {
  const check = await requireAdminWithTotp(totpCode);
  if ("error" in check) return { ok: false, error: check.error };
  await db
    .update(users)
    .set({ emailVerified: false })
    .where(eq(users.id, userId));
  await recordAudit({
    actor: check.actor,
    action: "user.force_email_reverify",
    targetUserId: userId,
  });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function logoutUserAllSessions(
  userId: string,
  totpCode: string
): Promise<Result> {
  const check = await requireAdminWithTotp(totpCode);
  if ("error" in check) return { ok: false, error: check.error };
  await lucia.invalidateUserSessions(userId);
  await recordAudit({
    actor: check.actor,
    action: "user.logout_all_sessions",
    targetUserId: userId,
  });
  revalidatePath("/admin/users");
  return { ok: true };
}
