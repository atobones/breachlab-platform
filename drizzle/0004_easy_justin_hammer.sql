CREATE TABLE "discord_oauth_states" (
	"state" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discord_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discord_username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_supporter" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "discord_oauth_states" ADD CONSTRAINT "discord_oauth_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_discord_id_unique" UNIQUE("discord_id");