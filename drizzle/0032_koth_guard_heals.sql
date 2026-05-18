-- Crown Wars — King's Guard Heal ability (Phase D).
--
-- Phase C (Eye of the Guard) is implementation-only — surfaces the
-- existing audit feed to the guard with no DB schema change. Phase D
-- adds the third ability: Crown Heal.
--
-- Heal mechanic:
--   - 1 token per round per guard (same scarcity as Lockdown).
--   - Resets the king's decay grace window: when applied, scoring
--     stops counting decay against the king's score for the next
--     DECAY_GRACE_SEC (5min).
--   - Implemented by inserting a `guard_heal` koth_event with
--     target_user_id = king's user id. The page's lastPatchAt
--     computation treats guard_heal as a patch source, so the decay
--     timer resets in exactly the same way as a self-patch.
--   - Public via Discord embed; visible to the king in their
--     dashboard as "decay reset".
--
-- Hard rule: only the current guard for the round can fire this, and
-- only once per round per guard. UNIQUE index enforces that.

CREATE TABLE IF NOT EXISTS "koth_guard_heals" (
    "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "round_id"        uuid NOT NULL REFERENCES "koth_rounds"("id") ON DELETE CASCADE,
    "guard_user_id"   uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "healed_user_id"  uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "applied_at"      timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "koth_guard_heals_one_per_round_guard"
    ON "koth_guard_heals" ("round_id", "guard_user_id");

CREATE INDEX IF NOT EXISTS "koth_guard_heals_by_round"
    ON "koth_guard_heals" ("round_id", "applied_at" DESC);
