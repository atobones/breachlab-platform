export const HEARTBEAT_SOURCES = [
  "ghost",
  "phantom",
  "specter",
  "phantom-deep",
] as const;
export type HeartbeatSource = (typeof HEARTBEAT_SOURCES)[number];

export type HeartbeatPayload = {
  source: HeartbeatSource;
  count: number;
};

// Sanity cap: `who | wc -l` on a healthy container should never exceed this.
// Higher values indicate a bug, misconfigured client, or abuse.
const MAX_REASONABLE_COUNT = 10_000;

export function parseHeartbeatPayload(input: unknown): HeartbeatPayload | null {
  if (!input || typeof input !== "object") return null;
  const { source, count } = input as { source?: unknown; count?: unknown };
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
  return { source: source as HeartbeatSource, count };
}
