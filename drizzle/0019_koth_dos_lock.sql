-- Anti-DoS lockout: when the in-arena watchdog flags an operator for
-- griefing (kill-on-login, fork bomb, sshd kill, etc.) the platform sets
-- dos_locked_until = now() + 24h on their koth_ssh_keys row. The
-- sync-keys.sh cron filters locked rows out of the per-slot
-- authorized_keys, so SSH refuses their connection until the lock expires.
--
-- Partial index because the column is NULL for every well-behaved player.

ALTER TABLE "koth_ssh_keys" ADD COLUMN "dos_locked_until" timestamp with time zone;

CREATE INDEX "koth_ssh_keys_dos_locked_idx"
  ON "koth_ssh_keys" ("dos_locked_until")
  WHERE "dos_locked_until" IS NOT NULL;
