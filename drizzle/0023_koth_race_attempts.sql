-- Crown Wars Ghost Replay — Phase C race attempts.
--
-- When a player decides to "race the ghost" of a past winning replay,
-- we create a koth_race_attempts row at race-start. Time elapses
-- client-side AND on the server (started_at is the authoritative
-- clock). When the player takes crown (any koth_events.crown_taken
-- matching their user_id with occurred_at > started_at), the API
-- writes finish_at and computes a delta vs the ghost's duration.
--
-- Anonymous attempts (SSH session not linked to a platform user_id)
-- are still recorded as honor-system entries — user_id = null,
-- the page accepts a self-reported finish.

CREATE TABLE IF NOT EXISTS "koth_race_attempts" (
    "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "replay_id"     uuid NOT NULL REFERENCES "koth_replays"("id") ON DELETE CASCADE,
    "user_id"       uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "started_at"    timestamp with time zone NOT NULL DEFAULT now(),
    "finished_at"   timestamp with time zone,
    "elapsed_sec"   integer,       -- finished_at - started_at, computed at finish
    "took_crown"    boolean NOT NULL DEFAULT false,
    "self_reported" boolean NOT NULL DEFAULT false, -- true when no user_id link
    "linked_event_id" bigint REFERENCES "koth_events"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "koth_race_attempts_replay_recent"
    ON "koth_race_attempts" ("replay_id", "elapsed_sec" ASC) WHERE took_crown = true;
CREATE INDEX IF NOT EXISTS "koth_race_attempts_user_recent"
    ON "koth_race_attempts" ("user_id", "started_at" DESC) WHERE user_id IS NOT NULL;

-- Sanity guards: elapsed must be non-negative when present, finished_at
-- must be >= started_at. Race attempt times capped at 1 hour — anything
-- longer is a stale unfinished attempt the cleanup cron should sweep.
ALTER TABLE "koth_race_attempts"
    ADD CONSTRAINT "koth_race_attempts_elapsed_nonneg"
    CHECK (elapsed_sec IS NULL OR (elapsed_sec >= 0 AND elapsed_sec <= 3600));

ALTER TABLE "koth_race_attempts"
    ADD CONSTRAINT "koth_race_attempts_finish_after_start"
    CHECK (finished_at IS NULL OR finished_at >= started_at);
