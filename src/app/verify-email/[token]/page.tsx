import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, emailVerifications } from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/tokens";

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tokenHash = await hashToken(token);

  const [record] = await db
    .select()
    .from(emailVerifications)
    .where(eq(emailVerifications.tokenHash, tokenHash))
    .limit(1);

  if (!record) {
    return (
      <div className="space-y-4">
        <h1 className="text-red text-xl">Invalid token</h1>
        <p className="text-sm text-muted">
          The verification link is invalid or has already been used.
        </p>
      </div>
    );
  }

  if (record.expiresAt < new Date()) {
    await db
      .delete(emailVerifications)
      .where(eq(emailVerifications.id, record.id));
    return (
      <div className="space-y-4">
        <h1 className="text-red text-xl">Token expired</h1>
        <p className="text-sm text-muted">
          Request a new verification email by registering again or contacting
          support.
        </p>
      </div>
    );
  }

  await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, record.userId));
  await db
    .delete(emailVerifications)
    .where(eq(emailVerifications.id, record.id));

  return (
    <div className="space-y-4">
      <h1 className="text-green text-xl">Email verified</h1>
      <p className="text-sm">
        Your operative account is fully active.{" "}
        <a href="/dashboard">Go to dashboard →</a>
      </p>
    </div>
  );
}
