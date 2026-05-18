-- Crown Wars Daily Shared-Seed Solo — Feature 2.
--
-- Every day at 00:00 UTC the system picks a single escalation path
-- (rotates through the koth_paths catalog) and freezes that as the
-- "today's challenge". All players who attempt the daily compete
-- against the SAME configuration — same path, same starting state —
-- so times are comparable. Wordle pattern: daily seed, shared room,
-- water-cooler effect.
--
-- Implementation notes:
--   - Seed is deterministic per UTC day. The picker uses a simple
--     hash of the date string to choose from active path slugs, so
--     two web instances generating the seed for the same day land on
--     the same pick (no coordination needed).
--   - Attempts are per-player rows with start/finish timestamps —
--     same shape as koth_race_attempts (Phase C) but scoped by day
--     instead of by replay.

CREATE TABLE IF NOT EXISTS "koth_daily_seeds" (
    "day_utc"      date PRIMARY KEY,
    "path_slug"    text NOT NULL,
    "generated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "koth_daily_attempts" (
    "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "day_utc"       date NOT NULL REFERENCES "koth_daily_seeds"("day_utc") ON DELETE CASCADE,
    "user_id"       uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "started_at"    timestamp with time zone NOT NULL DEFAULT now(),
    "finished_at"   timestamp with time zone,
    "elapsed_sec"   integer,
    "took_crown"    boolean NOT NULL DEFAULT false,
    "self_reported" boolean NOT NULL DEFAULT false,
    "linked_event_id" bigint REFERENCES "koth_events"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "koth_daily_attempts_day_recent"
    ON "koth_daily_attempts" ("day_utc", "elapsed_sec" ASC) WHERE took_crown = true;
CREATE INDEX IF NOT EXISTS "koth_daily_attempts_user_streak"
    ON "koth_daily_attempts" ("user_id", "day_utc" DESC) WHERE user_id IS NOT NULL;

-- One attempt per user per day. Anonymous attempts (user_id NULL)
-- aren't deduped — every visitor can try fresh.
CREATE UNIQUE INDEX IF NOT EXISTS "koth_daily_attempts_one_per_user"
    ON "koth_daily_attempts" ("day_utc", "user_id") WHERE user_id IS NOT NULL;

ALTER TABLE "koth_daily_attempts"
    ADD CONSTRAINT "koth_daily_attempts_elapsed_nonneg"
    CHECK (elapsed_sec IS NULL OR (elapsed_sec >= 0 AND elapsed_sec <= 3600));

ALTER TABLE "koth_daily_attempts"
    ADD CONSTRAINT "koth_daily_attempts_finish_after_start"
    CHECK (finished_at IS NULL OR finished_at >= started_at);
