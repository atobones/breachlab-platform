-- KoTH Honors layer — permanent records of operator achievements.
--
-- Phase 1/2 score live only inside a single 20-min round; once a round
-- closes its leaderboard is gone. Honors capture per-event achievements
-- that persist forever on the operator's profile so they have a reason
-- to come back: round wins, milestone counters, first-of-a-kind feats.
--
-- Lifetime counters (crown grabs / dethrones) are computed on demand
-- from koth_events.kind='crown_taken' and don't need a separate column.
-- Honors are reserved for things that are either round-scoped (round
-- winner) or first-time-only (first-ever crown, first escalation kill
-- via path X, etc).

CREATE TABLE "koth_honors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"round_id" uuid,
	-- round_winner    — top scorer of the round (one per round)
	-- first_crown     — first ever crown grab by this user
	-- first_dethrone  — first ever dethrone by this user
	-- first_path_kill — first dethrone via a specific path (one per (user, path))
	"kind" text NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "koth_honors" ADD CONSTRAINT "koth_honors_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "koth_honors" ADD CONSTRAINT "koth_honors_round_id_koth_rounds_id_fk"
	FOREIGN KEY ("round_id") REFERENCES "public"."koth_rounds"("id") ON DELETE set null;
--> statement-breakpoint
CREATE INDEX "koth_honors_user_time" ON "koth_honors" USING btree ("user_id","awarded_at" desc);
--> statement-breakpoint
CREATE INDEX "koth_honors_round" ON "koth_honors" USING btree ("round_id");
--> statement-breakpoint
-- Guard against double-awarding round_winner if the close endpoint is
-- replayed (cron retry, manual force-close). One winner per round.
CREATE UNIQUE INDEX "koth_honors_one_winner_per_round" ON "koth_honors" ("round_id")
	WHERE kind = 'round_winner';
