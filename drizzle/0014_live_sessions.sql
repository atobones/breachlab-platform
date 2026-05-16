-- Per-session live operative roster.
--
-- Companion to the aggregate `live_ops_counts` table. While that table
-- answers "how many sessions on each track right now", `live_sessions`
-- answers "who exactly is in which session right now". Existing aggregate
-- heartbeat clients keep working untouched; new clients that know
-- usernames + levels populate this table additionally.
--
-- Rows are written by:
--   - Specter / phantom-deep orchestrators on container spawn / reap
--     (orchestrator already holds username + level from oracle auth).
--   - Ghost / Phantom mono PAM session_open / session_close hooks
--     (HMAC handshake already proves the BL username; level = unix
--     account, e.g. `phantom7`).
--
-- The platform never reads from here for grading or scoring — read-only
-- visibility surface for /admin "operatives online right now".
--
-- Purge policy: rows whose last_heartbeat_at is older than 5 minutes
-- are considered stale and skipped by the admin query. A periodic
-- reaper (separate ops timer, not platform) hard-deletes rows older
-- than 1 hour to keep the table tiny.

CREATE TABLE "live_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"source" text NOT NULL,
	"level" text,
	"container_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "live_sessions_source_heartbeat_idx"
	ON "live_sessions" ("source", "last_heartbeat_at" DESC);
--> statement-breakpoint
CREATE INDEX "live_sessions_username_idx"
	ON "live_sessions" ("username");
--> statement-breakpoint
CREATE INDEX "live_sessions_heartbeat_idx"
	ON "live_sessions" ("last_heartbeat_at");
