-- Crown Wars — King's Guard role.
--
-- One slot per round. First operator to claim becomes the Guard:
-- they earn a fraction of the king's hold-time bonus per minute the
-- crown survives, regardless of who the king is. Asymmetric play:
-- king has the offensive crown, guard plays passive defense.
--
-- Crown Decay (companion mechanic, no schema change required — it's
-- a derived quantity in scoring.ts based on the king's patch
-- activity gap inside their tenure).

CREATE TABLE IF NOT EXISTS "koth_guards" (
    "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "round_id"    uuid NOT NULL REFERENCES "koth_rounds"("id") ON DELETE CASCADE,
    "user_id"     uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "claimed_at"  timestamp with time zone NOT NULL DEFAULT now()
);

-- One Guard per round — UNIQUE on round_id alone, not (round_id, user_id),
-- so a player can't bypass FCFS by re-claiming.
CREATE UNIQUE INDEX IF NOT EXISTS "koth_guards_one_per_round"
    ON "koth_guards" ("round_id");

CREATE INDEX IF NOT EXISTS "koth_guards_user_recent"
    ON "koth_guards" ("user_id", "claimed_at" DESC);
