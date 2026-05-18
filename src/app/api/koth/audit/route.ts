import { NextRequest, NextResponse } from "next/server";

import { safeBearerMatch } from "@/lib/auth/tokens";
import { recordAuditBatch, AuditClass } from "@/lib/koth/audit";

// Crown Wars — Live Audit Feed ingest endpoint.
//
// The sidecar's audit-streamer POSTs batches here. Auth: shared bearer
// (KOTH_ORACLE_TOKEN). Payload shape:
//
//   { round_id, events: [{ actor_user_id?, actor_slot?, syscall_class,
//                          summary, occurred_at? }, ...] }
//
// We cap batch size to keep a misbehaving streamer from melting the DB.

export const dynamic = "force-dynamic";

const MAX_BATCH = 256;
const MAX_BODY_BYTES = 256 * 1024; // 256 KiB

type RawEvent = {
  actor_user_id?: string | null;
  actor_slot?: string | null;
  syscall_class?: string;
  summary?: string;
  occurred_at?: string;
};

export async function POST(req: NextRequest) {
  const expected = process.env.KOTH_ORACLE_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "KOTH_ORACLE_TOKEN not configured" },
      { status: 500 },
    );
  }
  if (!safeBearerMatch(req.headers.get("authorization"), expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Cheap upfront size guard — full parse otherwise lets a 10MB POST
  // consume memory before we reject it.
  const cl = Number(req.headers.get("content-length") ?? "0");
  if (cl > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: `body too large (>${MAX_BODY_BYTES} bytes)` },
      { status: 413 },
    );
  }

  let body: { round_id?: string; events?: RawEvent[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const roundId = body.round_id?.trim();
  if (!roundId) {
    return NextResponse.json({ error: "round_id required" }, { status: 400 });
  }
  if (!Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json({ error: "events required" }, { status: 400 });
  }
  if (body.events.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `batch too large (max ${MAX_BATCH})` },
      { status: 413 },
    );
  }

  const normalised = body.events.map((e) => ({
    roundId,
    actorUserId: e.actor_user_id ?? null,
    actorSlot: e.actor_slot ?? null,
    syscallClass: (e.syscall_class ?? "other") as AuditClass,
    summary: e.summary ?? "",
    occurredAt: e.occurred_at ? new Date(e.occurred_at) : undefined,
  }));

  const res = await recordAuditBatch(normalised);
  return NextResponse.json({
    inserted: res.inserted,
    rejected: res.rejected,
  });
}
