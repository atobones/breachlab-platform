-- Crown Wars Daily — Discord auto-announce flag.
--
-- One row per UTC day in koth_daily_seeds. We want exactly one Discord
-- post per day announcing the new challenge. To make that idempotent
-- across multiple page hits at 00:00 UTC (race window: many users may
-- generate today's seed near-simultaneously), we add a CLAIMED-at-time
-- flag and use a conditional UPDATE WHERE discord_announced_at IS NULL
-- to atomically win the right to post.
--
-- No external cron needed — the first page hit of the new UTC day
-- triggers the announce; every later hit sees the flag set and skips.

ALTER TABLE "koth_daily_seeds"
    ADD COLUMN IF NOT EXISTS "discord_announced_at" timestamp with time zone;
