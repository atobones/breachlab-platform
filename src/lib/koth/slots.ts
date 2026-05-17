import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothRoundSlots, kothRounds } from "@/lib/db/schema";

// Resolve a kothN slot string (the unix account inside the arena
// container) back to the BL user_id by looking up the koth_round_slots
// assignment for the CURRENT active round.
//
// Migration 0020 moved slot assignment from the permanent
// koth_ssh_keys.slot column to the per-round koth_round_slots table.
// Each round, the first 10 operators to claim a slot get koth0..koth9
// for the lifetime of that round only.
//
// Returns null if the slot isn't claimed in the current round (arena
// is half-empty, or the player hasn't joined this round). The oracle
// endpoint stores NULL in actor_user_id / target_user_id in that case
// — the event still counts (crown changed) but isn't attributed.

export async function resolveSlotToUserId(
  slot: string | null | undefined,
): Promise<string | null> {
  if (!slot) return null;
  // Expect "kothN" where N is a single digit 0..9.
  const m = slot.match(/^koth(\d)$/);
  if (!m) return null;
  const idx = Number(m[1]);
  if (!Number.isInteger(idx) || idx < 0) return null;

  // Cross-join via lateral so a missing active round just yields no rows.
  const [row] = await db
    .select({ userId: kothRoundSlots.userId })
    .from(kothRoundSlots)
    .innerJoin(kothRounds, eq(kothRounds.id, kothRoundSlots.roundId))
    .where(
      and(
        eq(kothRoundSlots.slot, idx),
        eq(kothRounds.status, "active"),
      ),
    )
    .orderBy(desc(kothRounds.startedAt))
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
  // Phase 2.5 — Anti-DoS watchdog
  "dos_violation",
]);

export function isValidEventKind(kind: unknown): kind is string {
  return typeof kind === "string" && VALID_KINDS.has(kind);
}
