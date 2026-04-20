import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, emailVerifications } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email/send";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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
