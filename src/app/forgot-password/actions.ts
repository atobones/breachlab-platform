"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, passwordResets } from "@/lib/db/schema";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/email/send";
import { forgotPasswordSchema } from "@/lib/validation/auth";

const ONE_HOUR_MS = 60 * 60 * 1000;

type State = { ok: boolean; error: string | null };

export async function forgotPasswordAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid email" };
  const { email } = parsed.data;

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Always respond OK to prevent email enumeration
  if (user) {
    const token = generateToken();
    const tokenHash = await hashToken(token);
    await db.insert(passwordResets).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + ONE_HOUR_MS),
    });
    await sendPasswordResetEmail(email, token);
  }

  return { ok: true, error: null };
}
