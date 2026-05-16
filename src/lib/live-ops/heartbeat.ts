export const HEARTBEAT_SOURCES = [
  "ghost",
  "phantom",
  "specter",
  "phantom-deep",
] as const;
export type HeartbeatSource = (typeof HEARTBEAT_SOURCES)[number];

export type HeartbeatSessionEntry = {
  username: string;
  level?: string;
  containerId?: string;
  startedAt?: string; // ISO 8601, optional — server falls back to now()
};

export type HeartbeatPayload = {
  source: HeartbeatSource;
  count: number;
  // Optional per-session roster. Clients that know who is connected
  // (Specter/phantom-deep orchestrators, mono containers with PAM hooks)
  // attach this; clients that only know a count keep working untouched.
  sessions?: HeartbeatSessionEntry[];
};

// Sanity cap: `who | wc -l` on a healthy container should never exceed this.
// Higher values indicate a bug, misconfigured client, or abuse.
const MAX_REASONABLE_COUNT = 10_000;

// Defensive caps for the optional roster — protects the DB from a
// runaway client posting megabytes of bogus session entries.
const MAX_USERNAME_LEN = 64;
const MAX_LEVEL_LEN = 64;
const MAX_CONTAINER_ID_LEN = 128;

function parseSessionEntry(input: unknown): HeartbeatSessionEntry | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const username = raw.username;
  if (
    typeof username !== "string" ||
    username.length === 0 ||
    username.length > MAX_USERNAME_LEN
  ) {
    return null;
  }
  const entry: HeartbeatSessionEntry = { username };
  if (raw.level !== undefined && raw.level !== null) {
    if (typeof raw.level !== "string" || raw.level.length > MAX_LEVEL_LEN) {
      return null;
    }
    entry.level = raw.level;
  }
  const cid = raw.containerId ?? raw.container_id;
  if (cid !== undefined && cid !== null) {
    if (typeof cid !== "string" || cid.length > MAX_CONTAINER_ID_LEN) {
      return null;
    }
    entry.containerId = cid;
  }
  const startedAt = raw.startedAt ?? raw.started_at;
  if (startedAt !== undefined && startedAt !== null) {
    if (typeof startedAt !== "string") return null;
    const parsed = Date.parse(startedAt);
    if (Number.isNaN(parsed)) return null;
    entry.startedAt = new Date(parsed).toISOString();
  }
  return entry;
}

export function parseHeartbeatPayload(input: unknown): HeartbeatPayload | null {
  if (!input || typeof input !== "object") return null;
  const { source, count, sessions } = input as {
    source?: unknown;
    count?: unknown;
    sessions?: unknown;
  };
  if (
    typeof source !== "string" ||
    !(HEARTBEAT_SOURCES as readonly string[]).includes(source)
  ) {
    return null;
  }
  if (
    typeof count !== "number" ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > MAX_REASONABLE_COUNT
  ) {
    return null;
  }
  const payload: HeartbeatPayload = {
    source: source as HeartbeatSource,
    count,
  };
  if (sessions !== undefined) {
    if (!Array.isArray(sessions) || sessions.length > MAX_REASONABLE_COUNT) {
      return null;
    }
    const parsed: HeartbeatSessionEntry[] = [];
    for (const s of sessions) {
      const entry = parseSessionEntry(s);
      if (!entry) return null;
      parsed.push(entry);
    }
    payload.sessions = parsed;
  }
  return payload;
}
