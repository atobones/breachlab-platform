-- Crown Wars — Weapons Forge (player-submitted paths).
--
-- When a player takes crown via a slug not yet in the catalog, our
-- first-discovery handler fires a +50 bonus. The Weapons Forge then
-- gives that player the chance to formalise the technique: submit an
-- exploit + write-up, admin reviews, and on approval the slug enters
-- koth_paths as `<author>/<primitive>` — author credit forever.
--
-- Two columns on koth_paths capture provenance even for paths we add
-- ourselves (author_user_id NULL = "house" entries). The submissions
-- table is the workflow queue: pending → approved → linked to the
-- catalog row that got inserted; or pending → rejected with a reason
-- so the submitter gets feedback.

CREATE TABLE IF NOT EXISTS "koth_weapon_submissions" (
    "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"       uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "slug"          text NOT NULL,
    "title"         text NOT NULL,
    "technique_md"  text NOT NULL,
    "exploit_text"  text NOT NULL,
    "status"        text NOT NULL DEFAULT 'pending',
    "reviewer_id"   uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "review_notes"  text,
    "decided_at"    timestamp with time zone,
    "approved_path_slug" text,
    "created_at"    timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE "koth_weapon_submissions"
    ADD CONSTRAINT "koth_weapon_submissions_status_chk"
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn'));

-- Length ceilings so nothing pathological lands in DB; 5KiB exploit
-- is plenty for a privesc one-shot, 10KiB technique writeup is more
-- than a long-form blog post.
ALTER TABLE "koth_weapon_submissions"
    ADD CONSTRAINT "koth_weapon_submissions_exploit_size"
    CHECK (length(exploit_text) BETWEEN 1 AND 5120);
ALTER TABLE "koth_weapon_submissions"
    ADD CONSTRAINT "koth_weapon_submissions_technique_size"
    CHECK (length(technique_md) BETWEEN 1 AND 10240);
ALTER TABLE "koth_weapon_submissions"
    ADD CONSTRAINT "koth_weapon_submissions_slug_shape"
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,63}$');
ALTER TABLE "koth_weapon_submissions"
    ADD CONSTRAINT "koth_weapon_submissions_title_size"
    CHECK (length(title) BETWEEN 4 AND 120);

CREATE INDEX IF NOT EXISTS "koth_weapon_submissions_status_recent"
    ON "koth_weapon_submissions" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "koth_weapon_submissions_user_recent"
    ON "koth_weapon_submissions" ("user_id", "created_at" DESC);

-- One pending submission per (user, slug) — prevents accidental
-- double-submits without blocking re-submission after a rejection.
CREATE UNIQUE INDEX IF NOT EXISTS "koth_weapon_submissions_one_pending_per_slug"
    ON "koth_weapon_submissions" ("user_id", "slug")
    WHERE status = 'pending';

-- Author attribution on the catalog itself. Approved submissions
-- INSERT into koth_paths with author_user_id set; legacy "house"
-- entries stay NULL. The UI shows a credit line wherever the path
-- appears.
ALTER TABLE "koth_paths"
    ADD COLUMN IF NOT EXISTS "author_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "koth_paths"
    ADD COLUMN IF NOT EXISTS "submission_id" uuid REFERENCES "koth_weapon_submissions"("id") ON DELETE SET NULL;
