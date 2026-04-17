"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";

type Result = { ok: true } | { ok: false; error: string };

async function requireAdmin(): Promise<
  { user: { id: string; username: string } } | { error: string }
> {
  const { user } = await getCurrentSession();
  if (!user || !user.isAdmin || !user.totpEnabled) {
    return { error: "unauthorized" };
  }
  return { user: { id: user.id, username: user.username } };
}

export async function toggleUserAdmin(
  userId: string,
  nextValue: boolean
): Promise<Result> {
  const check = await requireAdmin();
  if ("error" in check) return { ok: false, error: check.error };
  if (check.user.id === userId) {
    return { ok: false, error: "cannot modify your own admin flag" };
  }
  await db
    .update(users)
    .set({ isAdmin: nextValue })
    .where(eq(users.id, userId));
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetUserTotp(userId: string): Promise<Result> {
  const check = await requireAdmin();
  if ("error" in check) return { ok: false, error: check.error };
  if (check.user.id === userId) {
    return { ok: false, error: "cannot reset your own TOTP" };
  }
  await db
    .update(users)
    .set({ totpSecret: null })
    .where(eq(users.id, userId));
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function forceEmailReverify(userId: string): Promise<Result> {
  const check = await requireAdmin();
  if ("error" in check) return { ok: false, error: check.error };
  await db
    .update(users)
    .set({ emailVerified: false })
    .where(eq(users.id, userId));
  revalidatePath("/admin/users");
  return { ok: true };
}
