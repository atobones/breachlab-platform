import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothRounds } from "@/lib/db/schema";
import { safeBearerMatch } from "@/lib/auth/tokens";

// Open a new KoTH round. Called by reset-arena.sh on prod every 20
// minutes (host cron). If a round is currently active, mark it 'reset'
// before opening the new one — overlapping active rounds are forbidden.
//
// Payload (all optional):
//   { container_id?: string }
//
// Returns: { id: <new round uuid> }

export async function POST(req: Request) {
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

  let body: { container_id?: string } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Close any currently-active round as 'reset' so the new round is
  // unambiguously the only active one. Done in two statements (no
  // transaction wrapper) because the worst case — race two concurrent
  // opens — produces a brief overlap then resolves on the next call.
  await db
    .update(kothRounds)
    .set({
      status: "reset",
      endedAt: new Date(),
      resetReason: "superseded-by-new-round",
    })
    .where(eq(kothRounds.status, "active"));

  const [inserted] = await db
    .insert(kothRounds)
    .values({
      status: "active",
      containerId: body.container_id ?? null,
    })
    .returning({ id: kothRounds.id });

  return NextResponse.json({ id: inserted.id });
}
