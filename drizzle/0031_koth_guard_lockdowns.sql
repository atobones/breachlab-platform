-- Crown Wars — King's Guard Lockdown ability (Phase B).
--
-- Phase A shipped Guard as a passive role: one slot per round (FCFS),
-- scoring half the king's active-hold seconds. Players (and Boss)
-- correctly flagged it as "паразит" — earns without doing.
--
-- Phase B gives the Guard a single decisive action per round:
--   ▸ LOCKDOWN <path-slug>  — picks one exploit primitive and freezes
--     it for 3 minutes. During the lockdown window, the oracle refuses
--     to count crown_taken events via that path; instead it records a
--     `crown_blocked` event (so the attempt is still audited but no
--     score lands and the attacker sees the rejection).
--
-- Design constraints:
--   - 1 token per round per guard. High-stakes choice — pick the
--     right moment and the right path.
--   - 3-minute window. Long enough to disrupt a coordinated push,
--     short enough that it doesn't grief the round.
--   - Public — broadcast via Discord embed AND visible on /battles/koth
--     so attackers immediately know to switch primitives.
--   - Hard fail on duplicate per round via the partial unique index
--     below (one lockdown_used row per (round_id, guard_user_id)).
--
-- Enforcement happens at the oracle event-handler boundary, not in
-- the arena binary. Arena's `crown-claim` still emits events; the
-- platform-side handler is the gatekeeper. See lib/koth/guards.ts
-- :checkLockdown helper called from the crown_taken handler.

CREATE TABLE IF NOT EXISTS "koth_guard_lockdowns" (
    "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "round_id"       uuid NOT NULL REFERENCES "koth_rounds"("id") ON DELETE CASCADE,
    "guard_user_id"  uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "path_slug"      text NOT NULL,
    "started_at"     timestamp with time zone NOT NULL DEFAULT now(),
    "expires_at"     timestamp with time zone NOT NULL,
    "blocked_count"  integer NOT NULL DEFAULT 0
);

-- One lockdown per (round, guard). The guard gets a single token per
-- round; trying to claim a second one trips this index.
CREATE UNIQUE INDEX IF NOT EXISTS "koth_guard_lockdowns_one_per_round_guard"
    ON "koth_guard_lockdowns" ("round_id", "guard_user_id");

-- Hot-path index for the oracle's lockdown check on every incoming
-- crown_taken event: "is this round/path currently locked?"
CREATE INDEX IF NOT EXISTS "koth_guard_lockdowns_active"
    ON "koth_guard_lockdowns" ("round_id", "path_slug", "expires_at");

-- Sanity: expires_at must be strictly after started_at.
ALTER TABLE "koth_guard_lockdowns"
    ADD CONSTRAINT "koth_guard_lockdowns_window_valid"
    CHECK (expires_at > started_at);
