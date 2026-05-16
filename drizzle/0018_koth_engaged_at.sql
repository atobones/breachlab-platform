-- KoTH — engaged-on-first-crown timer model.
--
-- The 30-minute round clock used to start the moment the cron created
-- the round, regardless of whether anyone was playing. Result: rounds
-- ticked into empty arenas and a player who joined late had only the
-- residual time. The fix: don't start the clock until the first crown
-- is actually claimed.
--
-- engaged_at is NULL while the arena is "standing by" — the round
-- exists, the container is warm, but no one has taken the crown yet.
-- The oracle event handler sets engaged_at = now() on the first
-- crown_taken in the round (idempotent via the IS NULL guard).
--
-- The close cron (now */1) hits /api/koth/round/close-if-due every
-- minute; the endpoint no-ops while engaged_at is null OR not yet
-- past the 30-minute window from engaged_at.

ALTER TABLE "koth_rounds" ADD COLUMN "engaged_at" timestamp with time zone;
