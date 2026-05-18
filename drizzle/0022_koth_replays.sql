-- Crown Wars Ghost Replay — Phase A storage layer.
--
-- Every SSH session into the KoTH arena is recorded as an asciinema v2
-- cast (player-side, per-slot, per-session). At session close OR at the
-- moment of a crown_taken event, the cast is uploaded by the sidecar
-- to this table.
--
-- Storage strategy: cast text inlined as TEXT column. Typical cast size
-- is < 200KB for a 5-min session; we cap at 5MB upstream (sidecar
-- refuses to upload larger files). Inlining keeps the read path simple
-- — no object store dependency, single query to render a replay.
--
-- Kind taxonomy:
--   "session_close"   — full recording of a player's SSH session,
--                       uploaded after they log out
--   "crown_moment"    — last 60s of the WINNER's terminal at the moment
--                       crown was claimed; cheap to produce and the
--                       most-shareable artifact ("the kill clip")
--   "ambient"         — last 60s of ALL OTHER slots at crown moment,
--                       so splitscreen replay can show what each peer
--                       was doing when the king fell
--
-- All recordings are public by design (race-the-ghost mechanic). The
-- rules page warns operators that crown attempts are recorded.

CREATE TABLE IF NOT EXISTS "koth_replays" (
    "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "round_id"        uuid NOT NULL REFERENCES "koth_rounds"("id") ON DELETE CASCADE,
    "user_id"         uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "actor_slot"      text NOT NULL,                     -- "koth0".."koth9"
    "kind"            text NOT NULL,                     -- session_close | crown_moment | ambient
    "duration_sec"    integer,                           -- recorded length, null until probed
    "asciicast"       text NOT NULL,                     -- v2 cast format (jsonl as one blob)
    "byte_size"       integer NOT NULL,                  -- octet_length(asciicast), denormalised for UI
    "linked_event_id" bigint REFERENCES "koth_events"("id") ON DELETE SET NULL, -- crown_taken event when kind="crown_moment"
    "recorded_at"     timestamp with time zone NOT NULL,
    "uploaded_at"     timestamp with time zone NOT NULL DEFAULT now(),
    "sha256"          text NOT NULL UNIQUE                -- of the asciicast text — idempotent uploads
);

CREATE INDEX IF NOT EXISTS "koth_replays_round_recent" ON "koth_replays" ("round_id", "recorded_at" DESC);
CREATE INDEX IF NOT EXISTS "koth_replays_user_recent"  ON "koth_replays" ("user_id", "recorded_at" DESC) WHERE "user_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "koth_replays_kind"         ON "koth_replays" ("kind", "uploaded_at" DESC);

-- byte_size sanity guard at the column level. 5MB ceiling matches the
-- sidecar-side refusal threshold. Anything bigger is either an attack
-- (recording-fill-disk) or a bug; reject at write time.
ALTER TABLE "koth_replays"
    ADD CONSTRAINT "koth_replays_byte_size_ceiling"
    CHECK (byte_size > 0 AND byte_size <= 5242880);

ALTER TABLE "koth_replays"
    ADD CONSTRAINT "koth_replays_kind_enum"
    CHECK (kind IN ('session_close', 'crown_moment', 'ambient'));
