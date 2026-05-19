-- Crown Wars Daily — Trail mode (Phase 2).
--
-- Adds a multi-step chain twist. The daily picks 3 primitives instead
-- of 1; the player has to take crown via each in order (step 2 only
-- reveals after step 1 lands; step 3 only after step 2). All steps
-- count as ONE daily attempt — total elapsed is finishedAt - startedAt.
--
-- twist_mode = 'trail' twist payload shape:
--   {
--     "ordered": true,
--     "steps": [
--       { "slug": "<primitive_slug>", "name": "<human name>", "hint": "<one-line hint>" },
--       { "slug": "...", "name": "...", "hint": "..." },
--       { "slug": "...", "name": "...", "hint": "..." }
--     ]
--   }
--
-- The seed's `path_slug` column stays populated with steps[0].slug
-- for backwards compat with leaderboard / personal-best lookups that
-- key off path_slug. The trail-specific stuff lives in twist.
--
-- koth_daily_attempts.steps_completed tracks per-attempt progress so
-- partial completion (e.g. 2/3 steps done) survives page reload and
-- re-fetches on poll. Empty array on insert; finishDailyAttempt
-- mutates it as crown_taken events land.
--
-- Picker is in lib/koth/daily.ts:generateTwist (trail branch).
-- Deterministic from sha256(day) so two web instances pick the same
-- 3 primitives without coordination.

ALTER TABLE "koth_daily_seeds"
    DROP CONSTRAINT IF EXISTS "koth_daily_seeds_twist_mode_known";

ALTER TABLE "koth_daily_seeds"
    ADD CONSTRAINT "koth_daily_seeds_twist_mode_known"
    CHECK (twist_mode IN ('plain', 'encoded', 'riddle', 'trail'));

ALTER TABLE "koth_daily_attempts"
    ADD COLUMN IF NOT EXISTS "steps_completed" jsonb NOT NULL DEFAULT '[]'::jsonb;
