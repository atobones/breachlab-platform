-- Per-round slot rotation — Phase 2.6.
--
-- Previously koth_ssh_keys.slot was the player's PERMANENT slot
-- assignment (UNIQUE constraint on slot). With 5 slots and growing
-- DAU, the arena hit the "full" wall — every new operator after the
-- first 5 was locked out forever.
--
-- This migration:
--   1. Creates koth_round_slots — slot is per (round_id, slot), so a
--      slot frees up the moment a round closes.
--   2. Backfills the current active round's slot assignments from
--      the existing koth_ssh_keys rows. No disruption to operators
--      currently on the box: they keep their slot for the rest of
--      the active round.
--   3. Drops the UNIQUE constraint on koth_ssh_keys.slot. The column
--      stays in place as a "last seen slot" hint, but is no longer
--      load-bearing. sync-keys.sh and the runtime resolver both
--      read from koth_round_slots now.
--
-- Slot count also bumps 5 → 10 (slot 0..9). Arena container's
-- Dockerfile loops over 0..9 to create unix users + key dirs.

CREATE TABLE "koth_round_slots" (
    "round_id" uuid NOT NULL REFERENCES "koth_rounds"("id") ON DELETE CASCADE,
    "slot" integer NOT NULL CHECK ("slot" >= 0 AND "slot" <= 9),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "claimed_at" timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY ("round_id", "slot"),
    UNIQUE ("round_id", "user_id")
);

CREATE INDEX "koth_round_slots_user_idx"
    ON "koth_round_slots" ("user_id");

-- Backfill from existing permanent slot assignments for the current
-- active round. ON CONFLICT DO NOTHING is defensive in case this
-- migration is re-run.
INSERT INTO "koth_round_slots" ("round_id", "slot", "user_id")
SELECT r."id", k."slot", k."user_id"
  FROM "koth_ssh_keys" k
  CROSS JOIN LATERAL (
    SELECT "id" FROM "koth_rounds"
     WHERE "status" = 'active'
     ORDER BY "started_at" DESC
     LIMIT 1
  ) r
 WHERE k."slot" >= 0 AND k."slot" <= 9
   AND (k."dos_locked_until" IS NULL OR k."dos_locked_until" <= now())
ON CONFLICT DO NOTHING;

-- Drop the UNIQUE constraint on koth_ssh_keys.slot. Drizzle's
-- generator names unique-on-single-column constraints
-- "<table>_<column>_unique"; the IF EXISTS guard makes this safe if
-- the constraint name differs in some prod instances.
ALTER TABLE "koth_ssh_keys"
    DROP CONSTRAINT IF EXISTS "koth_ssh_keys_slot_unique";
