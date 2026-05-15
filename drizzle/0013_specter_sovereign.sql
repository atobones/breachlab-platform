-- L14 Specter Sovereign meta-game state.
--
-- Hidden side-quest unlocked after Specter I (L13) graduation. Player
-- collects 4 fragments planted in L10/L11/L12/L13, decodes each with a
-- distinct transformation (base32 / reverse / rot13 / strip-prefix),
-- concatenates with their username, takes first 16 of sha256, submits
-- via the platform shell `seal <key>` command.
--
-- rank=1 = first solver = "Sovereign" (gets green name-aura site-wide
--                                       + Discord announcement + badge)
-- rank>=2 = subsequent solvers = "Mystery-Solved" (badge only)

ALTER TABLE "users" ADD COLUMN "specter_sovereign_solved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "specter_sovereign_rank" integer;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "specter_sovereign_attempts" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "specter_sovereign_last_attempt_at" timestamp with time zone;
--> statement-breakpoint
-- Rank uniqueness — only one Sovereign (rank=1), and only one of each
-- subsequent rank. Partial unique index because most users have NULL.
CREATE UNIQUE INDEX "users_specter_sovereign_rank_unique" ON "users" ("specter_sovereign_rank") WHERE "specter_sovereign_rank" IS NOT NULL;
