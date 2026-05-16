"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { kothSshKeys } from "@/lib/db/schema";
import {
  parseAndValidatePubkey,
  pickFreeSlot,
  findKeyForUser,
} from "@/lib/koth/keys";

// Server action — registers the signed-in user's SSH pubkey, assigns
// the lowest free arena slot, and redirects back to /battles/koth.
// Errors surface as ?error=<msg> query strings the page reads.

export async function submitKothKey(formData: FormData): Promise<void> {
  const { user } = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/battles/koth");
  }

  const raw = formData.get("pubkey");
  if (typeof raw !== "string" || !raw.trim()) {
    redirect("/battles/koth?error=" + encodeURIComponent("pubkey required"));
  }

  const parsed = parseAndValidatePubkey(raw);
  if ("error" in parsed) {
    redirect("/battles/koth?error=" + encodeURIComponent(parsed.error));
  }

  const existing = await findKeyForUser(user.id);
  if (existing) {
    // Idempotent — already registered, just redirect (page shows slot).
    redirect("/battles/koth");
  }

  const slot = await pickFreeSlot();
  if (slot === null) {
    redirect(
      "/battles/koth?error=" +
        encodeURIComponent("arena is full — wait for next reset"),
    );
  }

  try {
    await db.insert(kothSshKeys).values({
      userId: user.id,
      pubkey: parsed.normalized,
      fingerprint: parsed.fingerprint,
      slot,
    });
  } catch {
    redirect(
      "/battles/koth?error=" +
        encodeURIComponent("registration failed — try a different key"),
    );
  }

  revalidatePath("/battles/koth");
  redirect("/battles/koth?registered=1");
}
