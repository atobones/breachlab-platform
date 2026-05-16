import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothSshKeys } from "@/lib/db/schema";

// Resolve a kothN slot string (the unix account inside the arena
// container) back to the BL user_id via koth_ssh_keys. The crown daemon
// inside the container only knows slot names; we bind it to the player
// here via the (user_id, slot) row stored at key-submission time.
//
// Returns null if the slot is currently unassigned (no row in
// koth_ssh_keys with this slot index). The oracle endpoint stores NULL
// in actor_user_id / target_user_id in that case — the event still
// counts (crown changed) but isn't attributed to a player yet.

export async function resolveSlotToUserId(
  slot: string | null | undefined,
): Promise<string | null> {
  if (!slot) return null;
  // Expect "kothN" where N is a single digit.
  const m = slot.match(/^koth(\d)$/);
  if (!m) return null;
  const idx = Number(m[1]);
  if (!Number.isInteger(idx) || idx < 0) return null;

  const [row] = await db
    .select({ userId: kothSshKeys.userId })
    .from(kothSshKeys)
    .where(eq(kothSshKeys.slot, idx))
    .limit(1);

  return row?.userId ?? null;
}

const VALID_KINDS = new Set([
  // Phase 1
  "crown_taken",
  "dethroned",
  "patched",
  "escalated",
  "tutorial",
  // Phase 2 — Escalation engine + Diamond commodity pricing
  "escalation_pending",
  "path_activated",
  "path_exploited",
  "path_patched_attributed",
  "path_closed",
]);

export function isValidEventKind(kind: unknown): kind is string {
  return typeof kind === "string" && VALID_KINDS.has(kind);
}
