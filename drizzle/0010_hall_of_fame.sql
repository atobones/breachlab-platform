CREATE TABLE "security_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"display_name" text NOT NULL,
	"discord_handle" text,
	"external_link" text,
	"finding_title" text NOT NULL,
	"finding_description" text,
	"class_ref" text,
	"severity" text DEFAULT 'medium' NOT NULL,
	"pr_ref" text,
	"security_score" integer DEFAULT 10 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"awarded_at" timestamp with time zone,
	"awarded_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_hall_of_fame" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "security_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "security_credits" ADD CONSTRAINT "security_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_credits" ADD CONSTRAINT "security_credits_awarded_by_users_id_fk" FOREIGN KEY ("awarded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "security_credits_status_idx" ON "security_credits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "security_credits_user_id_idx" ON "security_credits" USING btree ("user_id");