"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { kothRoundSlots, kothSshKeys } from "@/lib/db/schema";
import {
  currentActiveRoundId,
  findKeyForUser,
  findRoundSlotForUser,
  parseAndValidatePubkey,
  pickFreeSlotForRound,
} from "@/lib/koth/keys";
import { claimGuard } from "@/lib/koth/guards";

// Server actions for /battles/koth — registering an SSH key and
// claiming a slot in the current round. Permanent slot assignment was
// retired in migration 0020; every round has its own pool of 10 slots
// that operators claim from at the start.

const FULL_ERR = "arena is full for this round — wait for next reset";
const NO_ROUND_ERR = "no active round — arena is recreating, try in 30s";
const GENERIC_ERR = "registration failed — try again";

// Atomic slot claim — used by both submitKothKey (first-time
// registration) and joinKothRound (existing key, new round). Retries
// the pick/insert loop on race losses with another concurrent claim.
async function claimSlotForRound(
  userId: string,
  roundId: string,
): Promise<{ slot: number } | { error: string }> {
  // Already in this round? Idempotent — return the existing slot.
  const existing = await findRoundSlotForUser(userId, roundId);
  if (existing) return { slot: existing.slot };

  let attempts = 0;
  while (attempts < 12) {
    attempts++;
    const slot = await pickFreeSlotForRound(roundId);
    if (slot === null) return { error: FULL_ERR };
    try {
      await db.insert(kothRoundSlots).values({
        roundId,
        slot,
        userId,
      });
      return { slot };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Slot collision — another player grabbed the same slot, retry.
      if (msg.includes("koth_round_slots_pkey")) continue;
      // User already in this round via another concurrent request.
      if (msg.includes("koth_round_slots_round_user_unique")) {
        const fresh = await findRoundSlotForUser(userId, roundId);
        if (fresh) return { slot: fresh.slot };
        return { error: GENERIC_ERR };
      }
      return { error: GENERIC_ERR };
    }
  }
  return { error: GENERIC_ERR };
}

// Register an SSH pubkey AND claim a slot in the current round in
// one shot. First-time registration flow.
export async function submitKothKey(formData: FormData): Promise<void> {
  const { user } = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/battles/koth");
  }

  const raw = formData.get("pubkey");
  if (typeof raw !== "string" || !raw.trim()) {
    redirect("/battles/koth?error=" + encodeURIComponent("pubkey required"));
  }

  const parsed = parseAndValidatePubkey(raw as string);
  if ("error" in parsed) {
    redirect("/battles/koth?error=" + encodeURIComponent(parsed.error));
  }

  const roundId = await currentActiveRoundId();
  if (!roundId) {
    redirect("/battles/koth?error=" + encodeURIComponent(NO_ROUND_ERR));
  }

  // Insert or upsert the key row first. We don't care about its slot
  // column anymore (legacy), but the unique fingerprint + unique
  // user_id constraints still gate "one key per user" and "no key
  // re-use across users". Try-catch handles all three cases:
  //   - first-ever registration (insert succeeds)
  //   - user re-registering (user_id unique violation → just claim slot)
  //   - someone else uses this key (fingerprint unique violation → reject)
  const existingKey = await findKeyForUser(user.id);
  if (!existingKey) {
    try {
      // slot=0 is a defunct placeholder for the legacy NOT NULL column.
      // Once we drop the column entirely this disappears.
      await db.insert(kothSshKeys).values({
        userId: user.id,
        pubkey: parsed.normalized,
        fingerprint: parsed.fingerprint,
        slot: 0,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("koth_ssh_keys_fingerprint_unique")) {
        redirect(
          "/battles/koth?error=" +
            encodeURIComponent("that key is already in use by another player"),
        );
      }
      if (msg.includes("koth_ssh_keys_user_id_unique")) {
        // Concurrent registration from same user — fall through to slot claim.
      } else {
        redirect("/battles/koth?error=" + encodeURIComponent(GENERIC_ERR));
      }
    }
  }

  // Claim a slot in the current round.
  const claim = await claimSlotForRound(user.id, roundId as string);
  if ("error" in claim) {
    redirect("/battles/koth?error=" + encodeURIComponent(claim.error));
  }

  revalidatePath("/battles/koth");
  redirect("/battles/koth?registered=1");
}

// Claim a slot in the current round for a user who already has a
// registered SSH key. Called when an operator returns after their
// round closed and wants in on the next one.
export async function joinKothRound(): Promise<void> {
  const { user } = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/battles/koth");
  }

  const key = await findKeyForUser(user!.id);
  if (!key) {
    // No key yet — bounce to the registration form.
    redirect("/battles/koth");
  }

  const roundId = await currentActiveRoundId();
  if (!roundId) {
    redirect("/battles/koth?error=" + encodeURIComponent(NO_ROUND_ERR));
  }

  const claim = await claimSlotForRound(user!.id, roundId as string);
  if ("error" in claim) {
    redirect("/battles/koth?error=" + encodeURIComponent(claim.error));
  }

  revalidatePath("/battles/koth");
  redirect("/battles/koth?joined=1");
}

// Crown Decay companion — claim the King's Guard role for this round.
// FCFS at the DB level via koth_guards.round_id UNIQUE; this action
// surfaces the error inline if someone else won the race.
export async function claimGuardAction(): Promise<void> {
  const { user } = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/battles/koth");
  }

  const roundId = await currentActiveRoundId();
  if (!roundId) {
    redirect("/battles/koth?error=" + encodeURIComponent(NO_ROUND_ERR));
  }

  const r = await claimGuard(user!.id, roundId as string);
  if (!r.ok) {
    redirect("/battles/koth?error=" + encodeURIComponent(r.error));
  }

  revalidatePath("/battles/koth");
  redirect("/battles/koth?guard=1");
}
