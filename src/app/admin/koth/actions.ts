"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { kothRounds, kothSshKeys } from "@/lib/db/schema";

// Admin actions for KoTH arena. All gated on user.isAdmin (the admin
// layout already checks this for page rendering; we re-check here so
// server actions can't be invoked directly by non-admins).

async function requireAdmin() {
  const { user } = await getCurrentSession();
  if (!user || !user.isAdmin) {
    throw new Error("forbidden");
  }
  return user;
}

// Force-reset the active round. Mirrors what /api/koth/round/open does
// but skips the bearer auth path — admin session is the auth here.
// Does NOT recreate the arena container (that's the host-side
// reset-arena.sh job). Just closes the DB round so a fresh one opens
// on the next host-cron tick or admin click.
export async function forceCloseActiveRound(): Promise<void> {
  await requireAdmin();
  await db
    .update(kothRounds)
    .set({
      status: "reset",
      endedAt: new Date(),
      resetReason: "admin-force-close",
    })
    .where(eq(kothRounds.status, "active"));
  revalidatePath("/admin/koth");
  revalidatePath("/battles/koth");
}

// Open a fresh round (server-side, no bearer needed for admin path).
export async function adminOpenRound(): Promise<void> {
  await requireAdmin();
  // Defensive: close any active round first to preserve single-active
  // invariant.
  await db
    .update(kothRounds)
    .set({
      status: "reset",
      endedAt: new Date(),
      resetReason: "superseded-by-admin",
    })
    .where(eq(kothRounds.status, "active"));
  await db.insert(kothRounds).values({ status: "active" });
  revalidatePath("/admin/koth");
  revalidatePath("/battles/koth");
}

// Revoke a player's slot — deletes the koth_ssh_keys row. Sync-keys
// cron will pick this up within 60s and overwrite the slot's
// authorized_keys with empty, locking SSH ingress for that slot.
export async function revokeSlot(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) {
    throw new Error("userId required");
  }
  await db.delete(kothSshKeys).where(eq(kothSshKeys.userId, userId));
  revalidatePath("/admin/koth");
}

// Mark a player's tutorial_completed_at as null so they revert to
// rookie. Useful for testing the badge flow.
export async function resetTutorial(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) {
    throw new Error("userId required");
  }
  await db
    .update(kothSshKeys)
    .set({ tutorialCompletedAt: sql`NULL` })
    .where(eq(kothSshKeys.userId, userId));
  revalidatePath("/admin/koth");
}
