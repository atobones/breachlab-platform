-- KoTH Phase 2 — Escalation engine + Diamond commodity pricing.
--
-- Phase 1 shipped a static box with 3 always-on exploit paths
-- (L7-SUID / L8-SUID / L17-Redis). Phase 2 adds:
--   - A catalog of exploit paths with base_value (Diamond pricing).
--   - Per-round event log for path activation / exploitation / closure.
--   - Snapshot of the path's value at event-time for fair scoring.
--   - An "escalation pending" warning row so the UI can show a
--     countdown before a new path opens against the current king.
--
-- Pricing model: each round, a path's current_value starts at base_value
-- and decrements by 2 per `path_exploited` event (floor 2). At round
-- close, the engine resets values and deactivates any escalation paths.
-- Snapshot the value on the event row at the moment of exploit so
-- scoring uses what the path was *worth at the time*, not what it is
-- now.

CREATE TABLE "koth_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	-- core    : always-on (L7-SUID, L8-SUID, L17-Redis). Present every round.
	-- escalation : activated by escalation daemon when crown_hold > threshold.
	"kind" text NOT NULL,
	"base_value" integer NOT NULL DEFAULT 12,
	"description" text,
	"hint" text,
	"level_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "koth_paths_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "koth_path_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"round_id" uuid NOT NULL,
	"path_id" uuid NOT NULL,
	-- activated | exploited | closed | pending
	-- pending  : 60s warning before activation lands
	-- activated: path now live in this round
	-- exploited: someone got root through this path (decrements value)
	-- closed   : path patched / deactivated by reset or attribution
	"kind" text NOT NULL,
	"slot" text,
	-- Snapshot of koth_paths.base_value minus accumulated 2*exploits at
	-- the moment this event was recorded. Lets scoring be deterministic
	-- without replaying decrements.
	"value_snapshot" integer,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_meta" jsonb
);
--> statement-breakpoint
ALTER TABLE "koth_path_events" ADD CONSTRAINT "koth_path_events_round_id_koth_rounds_id_fk"
	FOREIGN KEY ("round_id") REFERENCES "public"."koth_rounds"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "koth_path_events" ADD CONSTRAINT "koth_path_events_path_id_koth_paths_id_fk"
	FOREIGN KEY ("path_id") REFERENCES "public"."koth_paths"("id") ON DELETE restrict;
--> statement-breakpoint
CREATE INDEX "koth_path_events_round_time" ON "koth_path_events" USING btree ("round_id","occurred_at");
--> statement-breakpoint
CREATE INDEX "koth_path_events_path_time" ON "koth_path_events" USING btree ("path_id","occurred_at");
--> statement-breakpoint

-- ─────────────────────────────────────────────────────────
-- Seed: core paths (always-on) + escalation library (10).
-- ─────────────────────────────────────────────────────────

INSERT INTO "koth_paths" (slug, name, kind, base_value, description, hint, level_ref) VALUES
	('l7-suid',    'phantom-python3 SUID', 'core', 12, 'Argv code injection / PYTHONSTARTUP through the SUID python wrapper.',                            'PYTHONSTARTUP or -c argv injection.',     'L7'),
	('l8-suid',    'system-checker SUID',  'core', 12, 'Shell metachar injection through snprintf+system() inside the SUID ping wrapper.',                'Inject through hostname argv.',           'L8'),
	('l17-redis',  'Redis privesc',        'core', 12, 'CONFIG SET dir+dbfilename to write authorized_keys via redis-cli.',                               'CONFIG SET dir, dbfilename, then SAVE.',  'L17'),

	('writable-pythonpath',      'Writable PYTHONPATH',         'escalation', 14, 'A world-writable directory is on sys.path for a root cron python job.',                                 'Drop a module that root will import.',     null),
	('group-writable-cron-d',    'Group-writable /etc/cron.d',  'escalation', 12, '/etc/cron.d is group-writable by koth users — drop a job that runs as root.',                           'Append a job that runs as root.',          null),
	('python-cap-setuid',        'python3 with cap_setuid',     'escalation', 16, '/usr/local/bin/python3-diag carries cap_setuid+ep — getcap shows it; os.setuid(0) and spawn a shell.', 'getcap; os.setuid(0); /bin/bash.',         null),
	('leaked-root-creds',        'Leaked root credentials',     'escalation', 10, 'A maintenance script dropped /tmp/.cache/notes/creds.txt with the root password.',                       'find /tmp -name notes; su -.',             null),
	('wrapper-cron-injection',   'Writable healthcheck wrapper','escalation', 14, '/usr/local/bin/koth-healthcheck is group-writable and called by root cron every minute.',                'Edit the wrapper; wait one minute.',       null),
	('writable-passwd',          'World-writable /etc/passwd',  'escalation', 18, '/etc/passwd lost mode bits during a maintenance script — insert a uid 0 entry then su.',                 'openssl passwd, append uid 0 line, su.',   null),
	('writable-ld-preload',      'Writable /etc/ld.so.preload', 'escalation', 18, '/etc/ld.so.preload is world-writable — point at a .so that grants root on next SUID invocation.',        'Drop .so, set preload, run any SUID.',     null),
	('writable-init-script',     'Writable /etc/init.d job',    'escalation', 12, '/etc/init.d/koth-svc is world-writable and is invoked by root cron.',                                    'Append payload, wait for cron.',           null),
	('sudo-busybox-nopasswd',    'sudo busybox NOPASSWD',       'escalation', 14, 'koth users carry sudo NOPASSWD on /usr/bin/busybox — busybox ash drops a root shell.',                   'sudo busybox sh.',                          null),
	('suid-wrapper-userland',    'SUID wrapper to /tmp script', 'escalation', 12, '/usr/local/bin/koth-health is SUID-root and execs /tmp/health.sh — drop your payload there.',            'Write /tmp/health.sh; run /usr/local/bin/koth-health.', null);
--> statement-breakpoint

-- Allow the oracle endpoint to record new event kinds (Phase 2) on the
-- existing koth_events.kind text column. No constraint to alter — kind
-- is a free text column. Same for koth_events.exploit_path: now it can
-- carry any koth_paths.slug value (was just l7-suid/l8-suid/l17-redis).
--
-- For path-attributed patches: when scoring sees a `patched` event whose
-- exploit_path matches the path the actor was most recently dethroned
-- through (within the same round), award +5 instead of +3.
