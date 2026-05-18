-- Crown Wars — Mutating Arena (Drift Mode).
--
-- Every round picks a fresh mutation scheme: which alias each SUID
-- binary is exposed as, where the redis tooling lives, etc. The
-- primitives (catalog slugs) stay valid round-to-round, but the
-- specific recon and payload commands must adapt. Anti-playbook.
--
-- Phase A (this migration) lands the table + per-round seed. Arena
-- bind-mount support (renames inside the container) ships as Phase B.

CREATE TABLE IF NOT EXISTS "koth_mutations" (
    "round_id"       uuid PRIMARY KEY REFERENCES "koth_rounds"("id") ON DELETE CASCADE,
    -- Human-readable scheme label for the UI (e.g. "auth-helper drift").
    "scheme_label"   text NOT NULL,
    -- Active aliases keyed by the canonical (house) name. JSONB so we
    -- can grow the scheme without further migrations.
    --   { "phantom-python3": "auth-helper",
    --     "system-checker":  "ops-verify",
    --     "redis_dbfilename": "shadow.bak" }
    "scheme"         jsonb NOT NULL,
    "generated_at"   timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "koth_mutations_recent"
    ON "koth_mutations" ("generated_at" DESC);
