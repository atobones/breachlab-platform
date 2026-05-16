import { NextRequest, NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { liveOpsCounts, liveSessions } from "@/lib/db/schema";
import { parseHeartbeatPayload } from "@/lib/live-ops/heartbeat";
import { safeBearerMatch } from "@/lib/auth/tokens";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Dedicated token, NOT ADMIN_API_SECRET. Heartbeat clients live outside
  // the Ghost/Phantom containers (host-side systemd timer); a leaked
  // credential can only spoof operative counts. Compare constant-time so
  // the public source can't be used to mount a byte-by-byte timing oracle
  // against the token.
  //
  // LIVE_OPS_TOKEN_PREVIOUS, when set, is also accepted — used during
  // rotation windows to avoid heartbeat gaps while the host-side env on
  // the ghost/phantom timers is being updated. Drop the env var once the
  // host clients have picked up the new token (~1 heartbeat cycle = 30s).
  const authHeader = req.headers.get("authorization");
  const accepted = safeBearerMatch(authHeader, process.env.LIVE_OPS_TOKEN)
    || safeBearerMatch(authHeader, process.env.LIVE_OPS_TOKEN_PREVIOUS);
  if (!accepted) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const payload = parseHeartbeatPayload(body);
  if (!payload) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  // The aggregate count is the contract every existing heartbeat client
  // already honours — always update it first, even when a richer session
  // roster is also provided. That keeps `/admin` "live SSH" counts
  // continuous if the roster path ever fails.
  await db
    .insert(liveOpsCounts)
    .values({
      source: payload.source,
      count: payload.count,
      updatedAt: sql`now()`,
    })
    .onConflictDoUpdate({
      target: liveOpsCounts.source,
      set: { count: payload.count, updatedAt: sql`now()` },
    });

  // Optional per-session roster — replace-on-write within (source) scope.
  // Each heartbeat is the authoritative truth for its source at that
  // instant, so we wipe the source's prior rows and insert the current
  // snapshot transactionally. Sources that never send `sessions` keep
  // working as before (the aggregate count above is enough for them).
  if (payload.sessions !== undefined) {
    await db.transaction(async (tx) => {
      await tx.delete(liveSessions).where(eq(liveSessions.source, payload.source));
      if (payload.sessions && payload.sessions.length > 0) {
        await tx.insert(liveSessions).values(
          payload.sessions.map((s) => ({
            username: s.username,
            source: payload.source,
            level: s.level ?? null,
            containerId: s.containerId ?? null,
            startedAt: s.startedAt ? new Date(s.startedAt) : sql`now()`,
            lastHeartbeatAt: sql`now()`,
          })),
        );
      }
    });
  }

  return NextResponse.json({ ok: true });
}
