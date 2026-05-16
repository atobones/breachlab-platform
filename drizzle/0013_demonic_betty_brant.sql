CREATE TABLE "writeup_stars" (
	"writeup_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "writeup_stars_writeup_id_user_id_pk" PRIMARY KEY("writeup_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "writeups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"track_slug" text NOT NULL,
	"level_idx" integer NOT NULL,
	"title" text NOT NULL,
	"brief" text NOT NULL,
	"external_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"rejection_reason" text
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "site_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "author_bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_curator" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "writeup_stars" ADD CONSTRAINT "writeup_stars_writeup_id_writeups_id_fk" FOREIGN KEY ("writeup_id") REFERENCES "public"."writeups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writeup_stars" ADD CONSTRAINT "writeup_stars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writeups" ADD CONSTRAINT "writeups_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writeups" ADD CONSTRAINT "writeups_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "writeup_stars_writeup_idx" ON "writeup_stars" USING btree ("writeup_id");--> statement-breakpoint
CREATE UNIQUE INDEX "writeups_author_track_level_uniq" ON "writeups" USING btree ("author_id","track_slug","level_idx");--> statement-breakpoint
CREATE INDEX "writeups_track_level_idx" ON "writeups" USING btree ("track_slug","level_idx","status");
