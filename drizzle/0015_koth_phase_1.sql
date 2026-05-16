-- KoTH (Crown Wars) — Predator archetype, Phase 1.
--
-- One persistent arena container running 20-min rolling rounds. A crown
-- daemon inside the container polls /root/.crown owner every 60s and
-- tails auth.log, POSTing events to /api/koth/event with a bearer token.
--
-- Per-player SSH keys are injected into kothN unix slots inside the
-- container; the (user_id, slot) binding lives in koth_ssh_keys. One
-- key per user, slot is permanent once assigned.
--
-- koth_events is the audit log of every crown action (taken / dethroned
-- / patched / escalated / tutorial). koth_scores is the denormalized
-- aggregate per (round, user) updated by the scoring engine running on
-- the platform side every 60s.

CREATE TABLE "koth_rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	-- active | completed | reset
	"status" text DEFAULT 'active' NOT NULL,
	"container_id" text,
	"reset_reason" text
);
--> statement-breakpoint
CREATE TABLE "koth_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"round_id" uuid NOT NULL,
	-- crown_taken | dethroned | patched | escalated | tutorial
	"kind" text NOT NULL,
	"actor_user_id" uuid,
	"target_user_id" uuid,
	-- l7-suid | l8-suid | l17-redis | crontab | unknown
	"exploit_path" text,
	"points_delta" integer DEFAULT 0 NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_meta" jsonb
);
--> statement-breakpoint
CREATE TABLE "koth_scores" (
	"round_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"crown_holds" integer DEFAULT 0 NOT NULL,
	"dethrones" integer DEFAULT 0 NOT NULL,
	"patches" integer DEFAULT 0 NOT NULL,
	"crown_duration_seconds" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "koth_scores_round_id_user_id_pk" PRIMARY KEY("round_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "koth_ssh_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pubkey" text NOT NULL,
	"fingerprint" text NOT NULL,
	-- 0..N — maps to kothN unix account inside the container. Permanent.
	"slot" integer NOT NULL,
	-- First successful tutorial dethrone — unlocks ranked rotation.
	"tutorial_completed_at" timestamp with time zone,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "koth_ssh_keys_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "koth_ssh_keys_fingerprint_unique" UNIQUE("fingerprint"),
	CONSTRAINT "koth_ssh_keys_slot_unique" UNIQUE("slot")
);
--> statement-breakpoint
ALTER TABLE "koth_events" ADD CONSTRAINT "koth_events_round_id_koth_rounds_id_fk"
	FOREIGN KEY ("round_id") REFERENCES "public"."koth_rounds"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "koth_events" ADD CONSTRAINT "koth_events_actor_user_id_users_id_fk"
	FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "koth_events" ADD CONSTRAINT "koth_events_target_user_id_users_id_fk"
	FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "koth_scores" ADD CONSTRAINT "koth_scores_round_id_koth_rounds_id_fk"
	FOREIGN KEY ("round_id") REFERENCES "public"."koth_rounds"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "koth_scores" ADD CONSTRAINT "koth_scores_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "koth_ssh_keys" ADD CONSTRAINT "koth_ssh_keys_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX "koth_events_round_time" ON "koth_events" USING btree ("round_id","occurred_at");
--> statement-breakpoint
CREATE INDEX "koth_events_actor_time" ON "koth_events" USING btree ("actor_user_id","occurred_at");
