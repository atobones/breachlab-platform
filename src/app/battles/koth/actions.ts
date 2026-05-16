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

  // Slot assignment is racy: two simultaneous enlists can both read
  // "slot N free" → both INSERT → second hits UNIQUE constraint on
  // (slot). Retry the pick-and-insert loop on unique violation so the
  // second user just gets the next free slot instead of an error.
  // Caps at MAX_SLOT+2 attempts to keep the worst-case bounded.
  let inserted = false;
  let attempts = 0;
  while (!inserted && attempts < 8) {
    attempts++;
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
      inserted = true;
    } catch (e) {
      // Unique violation on (slot) — race lost, pick again. Other
      // unique violations (user_id, fingerprint) are terminal: bail.
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("koth_ssh_keys_user_id_unique")) {
        // Stand-down — concurrent enlist from same user. Their other
        // request already won; treat as success.
        revalidatePath("/battles/koth");
        redirect("/battles/koth");
      }
      if (msg.includes("koth_ssh_keys_fingerprint_unique")) {
        redirect(
          "/battles/koth?error=" +
            encodeURIComponent("that key is already in use by another player"),
        );
      }
      if (!msg.includes("koth_ssh_keys_slot_unique")) {
        // Some other DB error — bail with generic message.
        redirect(
          "/battles/koth?error=" +
            encodeURIComponent("registration failed — try again"),
        );
      }
      // slot collision — fall through to retry.
    }
  }
  if (!inserted) {
    redirect(
      "/battles/koth?error=" +
        encodeURIComponent("could not claim a slot — try again"),
    );
  }

  revalidatePath("/battles/koth");
  redirect("/battles/koth?registered=1");
}
