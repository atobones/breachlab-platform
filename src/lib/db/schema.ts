import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  unique,
  bigserial,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  totpSecret: text("totp_secret"),
  isAdmin: boolean("is_admin").notNull().default(false),
  discordId: text("discord_id").unique(),
  discordUsername: text("discord_username"),
  isSupporter: boolean("is_supporter").notNull().default(false),
  isHallOfFame: boolean("is_hall_of_fame").notNull().default(false),
  securityScore: integer("security_score").notNull().default(0),
  // Specter Sovereign meta-game (L14). Rank=1 is the first-solver
  // ("Sovereign"); rank>=2 are subsequent solvers (Mystery-Solved).
  // Rank 1 carries the green name-aura site-wide.
  specterSovereignSolvedAt: timestamp("specter_sovereign_solved_at", {
    withTimezone: true,
  }),
  specterSovereignRank: integer("specter_sovereign_rank"),
  // Rate-limit / anti-brute counters for the vault-seal endpoint.
  specterSovereignAttempts: integer("specter_sovereign_attempts")
    .notNull()
    .default(0),
  specterSovereignLastAttemptAt: timestamp(
    "specter_sovereign_last_attempt_at",
    { withTimezone: true },
  ),
  siteUrl: text("site_url"),
  authorBio: text("author_bio"),
  isCurator: boolean("is_curator").notNull().default(false),
  isFeaturedAuthor: boolean("is_featured_author").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

export const liveOpsCounts = pgTable("live_ops_counts", {
  source: text("source").primaryKey(),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LiveOpsCount = typeof liveOpsCounts.$inferSelect;

// Per-session roster — companion to the aggregate liveOpsCounts.
// Populated by Specter/phantom-deep orchestrators on spawn/reap and
// Ghost/Phantom mono PAM session_open/close hooks. Read-only visibility
// surface for /admin; never consulted for grading or auth.
export const liveSessions = pgTable(
  "live_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull(),
    source: text("source").notNull(),
    level: text("level"),
    containerId: text("container_id"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    sourceHeartbeatIdx: index("live_sessions_source_heartbeat_idx").on(
      t.source,
      t.lastHeartbeatAt.desc(),
    ),
    usernameIdx: index("live_sessions_username_idx").on(t.username),
    heartbeatIdx: index("live_sessions_heartbeat_idx").on(t.lastHeartbeatAt),
  }),
);

export type LiveSession = typeof liveSessions.$inferSelect;

// Admin action trail. Writes here are append-only — deletes should only
// ever happen via manual retention policy, not from the app.
export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Nullable so the audit record survives user deletion (actor goes NULL
  // instead of cascading the entry away).
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorUsername: text("actor_username").notNull(),
  action: text("action").notNull(),
  targetUserId: uuid("target_user_id"),
  targetSponsorId: uuid("target_sponsor_id"),
  metadata: text("metadata"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AdminAuditRow = typeof adminAuditLog.$inferSelect;

// Forensic write log — populated by Postgres triggers on every write to
// security_credits and users.security_score. Captures session metadata
// (session_user, application_name, client_addr) so out-of-band writes
// (e.g. manual psql from a DB-container shell) leave a row distinct from
// the platform's normal connection pool. The platform sets
// application_name='breachlab-platform' on its postgres-js client; any
// row here with a different application_name is by definition out-of-band.
export const securityWritesLog = pgTable(
  "security_writes_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tableName: text("table_name").notNull(),
    op: text("op").notNull(),
    rowPk: text("row_pk"),
    rowData: jsonb("row_data"),
    sessionUser: text("session_user").notNull(),
    applicationName: text("application_name"),
    clientAddr: text("client_addr"),
    appAuditActor: text("app_audit_actor"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("security_writes_log_created_at_idx").on(t.createdAt.desc()),
    index("security_writes_log_app_idx").on(t.applicationName, t.createdAt.desc()),
  ],
);

export const discordOauthStates = pgTable("discord_oauth_states", {
  state: text("state").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const emailVerifications = pgTable("email_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const passwordResets = pgTable("password_resets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tracks = pgTable("tracks", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("planned"),
  orderIdx: integer("order_idx").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const levels = pgTable("levels", {
  id: uuid("id").defaultRandom().primaryKey(),
  trackId: uuid("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  idx: integer("idx").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  pointsBase: integer("points_base").notNull().default(100),
  pointsFirstBloodBonus: integer("points_first_blood_bonus")
    .notNull()
    .default(50),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const flags = pgTable("flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  levelId: uuid("level_id")
    .notNull()
    .references(() => levels.id, { onDelete: "cascade" }),
  flagHash: text("flag_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  levelId: uuid("level_id")
    .notNull()
    .references(() => levels.id, { onDelete: "cascade" }),
  pointsAwarded: integer("points_awarded").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  sourceIp: text("source_ip"),
}, (t) => [
  unique("submissions_user_level_unique").on(t.userId, t.levelId),
]);

export const badges = pgTable("badges", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  refId: uuid("ref_id"),
  awardedAt: timestamp("awarded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const speedrunRuns = pgTable("speedrun_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  trackId: uuid("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  totalSeconds: integer("total_seconds"),
  isSuspicious: boolean("is_suspicious").notNull().default(false),
  reviewStatus: text("review_status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export type SpeedrunRun = typeof speedrunRuns.$inferSelect;

export const donations = pgTable("donations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  btcpayInvoiceId: text("btcpay_invoice_id").notNull().unique(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
});

export type Donation = typeof donations.$inferSelect;

// Per-player Specter session credentials. Inserted by /submit when a
// player clears Specter L_n: a row containing the HMAC-derived password
// for L_{n+1} (= the flag they will need to ssh into the next ephemeral).
// PAM hook on the L_{n+1} ephemeral hashes the SSH password, calls the
// oracle, oracle proxies to /api/specter/auth-check which looks up this
// table by (next_level, password_sha256) and returns the player_id.
// Single-player ephemerals: no concurrency concern.
export const specterSessionCreds = pgTable("specter_session_creds", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nextLevel: text("next_level").notNull(),
  passwordSha256: text("password_sha256").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (t) => [
  unique("specter_session_creds_user_level_unique").on(t.userId, t.nextLevel),
]);

export type SpecterSessionCred = typeof specterSessionCreds.$inferSelect;

// L0 bootstrap token. Player generates one from their dashboard, copies
// the plaintext once, exports BL_TOKEN=<plaintext> on the L0 ephemeral
// before running /opt/specter-verify. The L0 verifier sends BL_TOKEN to
// the oracle which calls /api/specter/resolve-token to map to user_id
// without going through the SSH PAM auth path (L0 has shared bootstrap
// creds — the token is what binds a verify call to a specific player).
export const specterPlayerTokens = pgTable("specter_player_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SpecterPlayerToken = typeof specterPlayerTokens.$inferSelect;

// ─────────────────────────────────────────────────────────
// KoTH (Crown Wars) — Predator archetype, Phase 1
// ─────────────────────────────────────────────────────────
//
// One persistent arena container running 20-min rolling rounds. A crown
// daemon inside the container polls /root/.crown owner every 60s and
// tails auth.log, POSTing events to /api/koth/event with KOTH_ORACLE_TOKEN.
// Per-player SSH keys are injected into koth0..kothN unix slots; the
// (user_id, slot) binding lives in koth_ssh_keys.

export const kothRounds = pgTable("koth_rounds", {
  id: uuid("id").defaultRandom().primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Set on the first crown_taken in this round. NULL = arena standing
  // by; the 30-min clock doesn't count down until someone actually
  // plays so first-arriver isn't punished with a residual window.
  engagedAt: timestamp("engaged_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  // active | completed | reset
  status: text("status").notNull().default("active"),
  containerId: text("container_id"),
  resetReason: text("reset_reason"),
});

export const kothEvents = pgTable(
  "koth_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    roundId: uuid("round_id")
      .notNull()
      .references(() => kothRounds.id, { onDelete: "cascade" }),
    // crown_taken | dethroned | patched | escalated | tutorial
    kind: text("kind").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    targetUserId: uuid("target_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // l7-suid | l8-suid | l17-redis | crontab | unknown
    exploitPath: text("exploit_path"),
    pointsDelta: integer("points_delta").notNull().default(0),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    rawMeta: jsonb("raw_meta"),
  },
  (t) => [
    index("koth_events_round_time").on(t.roundId, t.occurredAt),
    index("koth_events_actor_time").on(t.actorUserId, t.occurredAt),
  ],
);

export const kothScores = pgTable(
  "koth_scores",
  {
    roundId: uuid("round_id")
      .notNull()
      .references(() => kothRounds.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    points: integer("points").notNull().default(0),
    crownHolds: integer("crown_holds").notNull().default(0),
    dethrones: integer("dethrones").notNull().default(0),
    patches: integer("patches").notNull().default(0),
    crownDurationSeconds: integer("crown_duration_seconds")
      .notNull()
      .default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roundId, t.userId] })],
);

export const kothSshKeys = pgTable("koth_ssh_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  pubkey: text("pubkey").notNull(),
  fingerprint: text("fingerprint").notNull().unique(),
  // Legacy field — "last assigned slot" hint, no longer load-bearing.
  // Per-round slot is in koth_round_slots since migration 0020. The
  // UNIQUE constraint was dropped in the same migration.
  slot: integer("slot").notNull(),
  // First successful tutorial dethrone — unlocks ranked rotation.
  tutorialCompletedAt: timestamp("tutorial_completed_at", {
    withTimezone: true,
  }),
  addedAt: timestamp("added_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  // Set by the dos_violation event handler when the in-arena watchdog
  // flags griefing. While this is in the future, sync-keys.sh skips the
  // row, so SSH refuses the connection.
  dosLockedUntil: timestamp("dos_locked_until", { withTimezone: true }),
});

// Per-round slot assignment. Replaces the old permanent slot mapping
// in koth_ssh_keys.slot. On round open, this table is empty for the
// new round id — first 10 operators to claim get slots koth0..koth9.
// Migration 0020 also drops the UNIQUE constraint on
// koth_ssh_keys.slot (kept as a legacy hint column).
export const kothRoundSlots = pgTable(
  "koth_round_slots",
  {
    roundId: uuid("round_id")
      .notNull()
      .references(() => kothRounds.id, { onDelete: "cascade" }),
    slot: integer("slot").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    claimedAt: timestamp("claimed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.roundId, t.slot] }),
    uniqueIndex("koth_round_slots_round_user_unique").on(t.roundId, t.userId),
    index("koth_round_slots_user_idx").on(t.userId),
  ],
);

// ─────────────────────────────────────────────────────────
// KoTH Phase 2 — Escalation engine + Diamond commodity pricing
// ─────────────────────────────────────────────────────────
//
// koth_paths is the static catalog (core paths always-on every round;
// escalation paths activated by the daemon when crown_hold > 5 min).
// koth_path_events is the per-round log: activated / exploited / closed
// / pending. Each row carries value_snapshot so scoring is deterministic.

export const kothPaths = pgTable("koth_paths", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  // core | escalation
  kind: text("kind").notNull(),
  baseValue: integer("base_value").notNull().default(12),
  description: text("description"),
  hint: text("hint"),
  levelRef: text("level_ref"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const kothPathEvents = pgTable(
  "koth_path_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    roundId: uuid("round_id")
      .notNull()
      .references(() => kothRounds.id, { onDelete: "cascade" }),
    pathId: uuid("path_id")
      .notNull()
      .references(() => kothPaths.id, { onDelete: "restrict" }),
    // pending | activated | exploited | closed
    kind: text("kind").notNull(),
    slot: text("slot"),
    valueSnapshot: integer("value_snapshot"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    rawMeta: jsonb("raw_meta"),
  },
  (t) => [
    index("koth_path_events_round_time").on(t.roundId, t.occurredAt),
    index("koth_path_events_path_time").on(t.pathId, t.occurredAt),
  ],
);

// ─────────────────────────────────────────────────────────
// KoTH Honors — permanent records that survive round resets
// ─────────────────────────────────────────────────────────
//
// Round scores wipe every 20 min. Honors capture the achievements
// worth remembering: who won the round (one per round), first-ever
// milestones (first crown, first dethrone, first kill via a specific
// path). Lifetime counters (total crowns / total dethrones) are
// derived on the fly from koth_events — no separate column needed.

export const kothHonors = pgTable(
  "koth_honors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roundId: uuid("round_id").references(() => kothRounds.id, {
      onDelete: "set null",
    }),
    // round_winner | first_crown | first_dethrone | first_path_kill
    kind: text("kind").notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata"),
  },
  (t) => [
    index("koth_honors_user_time").on(t.userId, t.awardedAt.desc()),
    index("koth_honors_round").on(t.roundId),
  ],
);

export type KothRound = typeof kothRounds.$inferSelect;
export type KothEvent = typeof kothEvents.$inferSelect;
export type KothScore = typeof kothScores.$inferSelect;
export type KothSshKey = typeof kothSshKeys.$inferSelect;
export type KothPath = typeof kothPaths.$inferSelect;
export type KothPathEvent = typeof kothPathEvents.$inferSelect;
export type KothHonor = typeof kothHonors.$inferSelect;

export const writeups = pgTable("writeups", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  trackSlug: text("track_slug").notNull(),
  levelIdx: integer("level_idx").notNull(),
  title: text("title").notNull(),
  brief: text("brief").notNull(),
  externalUrl: text("external_url").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] })
    .notNull()
    .default("pending"),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
}, (t) => ({
  uniqAuthorLevel: uniqueIndex("writeups_author_track_level_uniq")
    .on(t.authorId, t.trackSlug, t.levelIdx),
  byTrackLevel: index("writeups_track_level_idx")
    .on(t.trackSlug, t.levelIdx, t.status),
}));

export const writeupStars = pgTable("writeup_stars", {
  writeupId: uuid("writeup_id")
    .notNull()
    .references(() => writeups.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.writeupId, t.userId] }),
  byWriteup: index("writeup_stars_writeup_idx").on(t.writeupId),
}));

export const authorStars = pgTable("author_stars", {
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.authorId, t.userId] }),
  byAuthor: index("author_stars_author_idx").on(t.authorId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type Level = typeof levels.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Badge = typeof badges.$inferSelect;

export { sponsors } from "@/lib/sponsors/schema";
export { securityCredits } from "@/lib/hall-of-fame/schema";
export type { Sponsor, NewSponsor } from "@/lib/sponsors/schema";
