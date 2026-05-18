-- Decouple Crown Wars (KoTH) path slugs from Phantom track codenames.
--
-- Before: 3 core paths in koth_paths were named after the Phantom
-- levels they were ported from — l7-suid, l8-suid, l17-redis — which
-- (a) made Crown Wars look like a Phantom mode-extension to players
-- who hadn't done Phantom, and (b) exposed internal track structure
-- in the player-facing kill-feed.
--
-- After: paths are named by the primitive they exercise, decoupled
-- from any specific BL track. Track link is preserved in level_ref
-- as a learning hint, not as the slug identity.
--
-- Principle: feedback_breachlab_battles_not_track_extensions (2026-05-18).

-- 1. Rename in the catalog.
UPDATE koth_paths SET slug = 'suid-python-wrapper'
WHERE slug = 'l7-suid';

UPDATE koth_paths SET slug = 'suid-shell-injection'
WHERE slug = 'l8-suid';

UPDATE koth_paths SET slug = 'redis-config-set-dir'
WHERE slug = 'l17-redis';

-- 2. Rewrite the slug stored as plain text in koth_events.exploit_path.
UPDATE koth_events SET exploit_path = 'suid-python-wrapper'
WHERE exploit_path = 'l7-suid';

UPDATE koth_events SET exploit_path = 'suid-shell-injection'
WHERE exploit_path = 'l8-suid';

UPDATE koth_events SET exploit_path = 'redis-config-set-dir'
WHERE exploit_path = 'l17-redis';

-- 3. Rewrite the slug embedded in koth_events.raw_meta (jsonb path_slug field).
UPDATE koth_events
SET raw_meta = jsonb_set(raw_meta, '{path_slug}', '"suid-python-wrapper"'::jsonb)
WHERE raw_meta->>'path_slug' = 'l7-suid';

UPDATE koth_events
SET raw_meta = jsonb_set(raw_meta, '{path_slug}', '"suid-shell-injection"'::jsonb)
WHERE raw_meta->>'path_slug' = 'l8-suid';

UPDATE koth_events
SET raw_meta = jsonb_set(raw_meta, '{path_slug}', '"redis-config-set-dir"'::jsonb)
WHERE raw_meta->>'path_slug' = 'l17-redis';
