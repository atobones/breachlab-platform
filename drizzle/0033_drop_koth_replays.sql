-- Drop the Ghost Replay feature tables.
--
-- koth_race_attempts has an FK on koth_replays (ON DELETE CASCADE) so
-- dropping replays first would cascade-delete attempts; we drop them
-- explicitly in order anyway for clarity.
--
-- This migration is irreversible. The decision to retire Ghost Replay
-- was made because the feature didn't justify its surface area —
-- public archive leaked arena internals through unfiltered output,
-- and player engagement (3 records in the first weeks) didn't warrant
-- maintenance cost. Recording infra in the arena (asciinema force-
-- command, session-wrap, inner-shell, sidecar replay-uploader) is
-- removed in the same release.

DROP TABLE IF EXISTS koth_race_attempts;
DROP TABLE IF EXISTS koth_replays;
