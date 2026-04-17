import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { liveOpsCounts } from "@/lib/db/schema";
import { parseHeartbeatPayload } from "@/lib/live-ops/heartbeat";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Dedicated token, NOT ADMIN_API_SECRET. Heartbeat clients live inside
  // Ghost/Phantom containers which players can root via SUID exploits (L18,
  // L22). Dedicated token caps blast radius: leaked credential lets attacker
  // spoof operative counts, nothing else.
  const authHeader = req.headers.get("authorization") ?? "";
  const token = process.env.LIVE_OPS_TOKEN;
  if (!token || authHeader !== `Bearer ${token}`) {
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
