import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { writeups } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";

const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 5;

function isValid(input: unknown): input is {
  trackSlug: string;
  levelIdx: number;
  title: string;
  brief: string;
  externalUrl: string;
} {
  if (!input || typeof input !== "object") return false;
  const i = input as Record<string, unknown>;
  if (typeof i.trackSlug !== "string" || i.trackSlug.length === 0) return false;
  if (typeof i.levelIdx !== "number" || i.levelIdx < 0) return false;
  if (typeof i.title !== "string" || i.title.length === 0 || i.title.length > 120) return false;
  if (typeof i.brief !== "string" || i.brief.length === 0 || i.brief.length > 280) return false;
  if (typeof i.externalUrl !== "string") return false;
  try {
    const u = new URL(i.externalUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  } catch {
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  const { user } = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!isValid(body)) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  // rate limit: 5 per hour per user
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recent = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(writeups)
    .where(and(eq(writeups.authorId, user.id), gte(writeups.submittedAt, since)));
  if (recent[0] && recent[0].count >= RATE_LIMIT) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  // upsert pending; do NOT override approved/rejected
  const inserted = await db
    .insert(writeups)
    .values({
      authorId: user.id,
      trackSlug: body.trackSlug,
      levelIdx: body.levelIdx,
      title: body.title,
      brief: body.brief,
      externalUrl: body.externalUrl,
    })
    .onConflictDoUpdate({
      target: [writeups.authorId, writeups.trackSlug, writeups.levelIdx],
      set: {
        title: body.title,
        brief: body.brief,
        externalUrl: body.externalUrl,
        submittedAt: sql`now()`,
      },
      setWhere: eq(writeups.status, "pending"),
    })
    .returning({ id: writeups.id });

  return NextResponse.json({ id: inserted[0]?.id ?? null });
}
