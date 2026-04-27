import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, emailVerifications } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email/send";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60_000;

export async function POST() {
  const { user } = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const [row] = await db
    .select({ id: users.id, email: users.email, verified: users.emailVerified })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }
  if (row.verified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  // Per-user 60s cooldown. The middleware rate-limit is per-IP at 10/min,
  // far too generous: one authenticated user clicking Resend six times
  // in a minute (Randark, 2026-04-27) sent six emails to a real inbox
  // and burned Resend quota. Gate at the API layer with a real
  // most-recent-token timestamp check so any caller — UI button,
  // refresh, retry storm, scripted abuse — is bounded to 1 email/min.
  const [recent] = await db
    .select({ createdAt: emailVerifications.createdAt })
    .from(emailVerifications)
    .where(eq(emailVerifications.userId, row.id))
    .orderBy(desc(emailVerifications.createdAt))
    .limit(1);
  if (recent) {
    const elapsedMs = Date.now() - new Date(recent.createdAt).getTime();
    if (elapsedMs < RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000);
      return NextResponse.json(
        {
          error: `A verification email was sent recently. Try again in ${retryAfter}s.`,
          retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }
  }

  // Invalidate any outstanding tokens so the newest email is the only valid
  // one — prevents stale links from lingering in a user's inbox.
  await db.delete(emailVerifications).where(eq(emailVerifications.userId, row.id));

  const token = generateToken();
  const tokenHash = await hashToken(token);
  await db.insert(emailVerifications).values({
    userId: row.id,
    tokenHash,
    expiresAt: new Date(Date.now() + ONE_DAY_MS),
  });

  try {
    await sendVerificationEmail(row.email, token);
  } catch (err) {
    console.warn("[resend-verification] email send failed", {
      userId: row.id,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not send email right now. Try again in a minute." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
