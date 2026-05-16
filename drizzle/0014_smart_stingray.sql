CREATE TABLE "author_stars" (
	"author_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "author_stars_author_id_user_id_pk" PRIMARY KEY("author_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_featured_author" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "author_stars" ADD CONSTRAINT "author_stars_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "author_stars" ADD CONSTRAINT "author_stars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "author_stars_author_idx" ON "author_stars" USING btree ("author_id");
