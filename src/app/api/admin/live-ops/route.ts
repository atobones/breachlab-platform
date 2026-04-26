import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { liveOpsCounts } from "@/lib/db/schema";
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

  return NextResponse.json({ ok: true });
}
