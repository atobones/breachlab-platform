-- Crown Wars Daily — Twist mode (Phase 1).
--
-- Adds per-day puzzle variety. Until now the daily showed the path
-- slug straight, so "today's primitive is writable-pythonpath" was
-- the whole game once a player knew the catalog. Twist hides or
-- riddles the slug so the player has to figure out *which* primitive
-- they're racing toward before they SSH in.
--
-- twist_mode:
--   'plain'   → no twist; show slug straight (matches pre-0030 behavior)
--   'encoded' → slug shown in an encoding (base64/rot13/reverse/hex)
--   'riddle'  → primitive described as a riddle; slug hidden until reveal
--
-- twist (jsonb): mode-specific payload. Shape per mode:
--   plain   → NULL
--   encoded → { "encoding": "base64"|"rot13"|"reverse"|"hex",
--              "displayed": "<encoded slug>",
--              "reveal_after_sec": <int>? }
--   riddle  → { "riddle": "<text>",
--              "reveal_after_sec": <int>? }
--
-- Picker generates the twist deterministically per UTC day from
-- sha256(day | slug) so two web instances producing the seed for
-- the same day end up with the same twist without coordination.
-- See lib/koth/daily.ts:generateTwist.
--
-- Backfill: existing seeds get twist_mode='plain' / twist=NULL.
-- Future inserts come through getOrCreateTodaySeed which assigns
-- a twist before persisting.

ALTER TABLE "koth_daily_seeds"
    ADD COLUMN IF NOT EXISTS "twist_mode" text NOT NULL DEFAULT 'plain';

ALTER TABLE "koth_daily_seeds"
    ADD COLUMN IF NOT EXISTS "twist" jsonb;

ALTER TABLE "koth_daily_seeds"
    ADD CONSTRAINT "koth_daily_seeds_twist_mode_known"
    CHECK (twist_mode IN ('plain', 'encoded', 'riddle'));
