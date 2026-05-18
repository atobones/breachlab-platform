-- Crown Wars — Live Audit Feed.
--
-- Outside-the-arena syscall capture: the sidecar runs strace against
-- the crown-holder's bash from the host's PID namespace (sidecar
-- launched with --pid=host so king-as-root inside the arena cannot
-- kill or hide from it). Captured execve/openat/setuid lines are
-- POSTed to the oracle and persisted here so the web can replay the
-- last N + push new events via SSE.
--
-- Designed for a HIGH-volume insert pattern (one row per syscall on a
-- busy crown holder). Hot path is the (round_id, occurred_at DESC)
-- index for the live tail. Old rows reaped by the existing arena
-- cleanup job (>24h) so the table doesn't unbounded-grow.

CREATE TABLE IF NOT EXISTS "koth_audit_events" (
    "id"             bigserial PRIMARY KEY,
    "round_id"       uuid NOT NULL REFERENCES "koth_rounds"("id") ON DELETE CASCADE,
    -- The user whose shell produced the event. NULL for system/cron
    -- syscalls captured by the streamer that aren't pinned to a
    -- specific player (rare but possible during transitions).
    "actor_user_id"  uuid REFERENCES "users"("id") ON DELETE SET NULL,
    -- Slot label (koth0..koth9) for display when actor_user_id is
    -- absent or for cross-reference with replays / kill-feed.
    "actor_slot"     text,
    -- Syscall class for colour-coding in the UI. Open-set values so
    -- new streamer flavours can land without DB migration:
    --   execve | openat | setuid | network | other
    "syscall_class"  text NOT NULL,
    -- The raw line as the streamer parsed it. Capped so a single
    -- malformed entry can't bloat the table.
    "summary"        text NOT NULL,
    "occurred_at"    timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "koth_audit_events"
    ADD CONSTRAINT "koth_audit_events_summary_size"
    CHECK (length(summary) BETWEEN 1 AND 1024);

ALTER TABLE "koth_audit_events"
    ADD CONSTRAINT "koth_audit_events_syscall_class_chk"
    CHECK (syscall_class IN ('execve', 'openat', 'setuid', 'network', 'fs', 'other'));

-- Hot index: live-tail of a round, newest first.
CREATE INDEX IF NOT EXISTS "koth_audit_events_round_recent"
    ON "koth_audit_events" ("round_id", "occurred_at" DESC);

-- Per-actor tail — used when filtering to a specific crown holder
-- (the default UI mode).
CREATE INDEX IF NOT EXISTS "koth_audit_events_actor_recent"
    ON "koth_audit_events" ("actor_user_id", "occurred_at" DESC)
    WHERE actor_user_id IS NOT NULL;
