"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, passwordResets } from "@/lib/db/schema";
import { hashToken } from "@/lib/auth/tokens";
import { hashPassword } from "@/lib/auth/password";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { lucia } from "@/lib/auth/lucia";

type State = { error: string | null };

export async function resetPasswordAction(
  token: string,
  _prev: State,
  formData: FormData
): Promise<State> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const tokenHash = await hashToken(token);
  const [record] = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, tokenHash))
    .limit(1);

  if (!record) return { error: "Invalid or used token" };
  if (record.expiresAt < new Date()) {
    await db.delete(passwordResets).where(eq(passwordResets.id, record.id));
    return { error: "Token expired" };
  }

  const newHash = await hashPassword(parsed.data.password);
  await db
    .update(users)
    .set({ passwordHash: newHash })
    .where(eq(users.id, record.userId));
  await db.delete(passwordResets).where(eq(passwordResets.id, record.id));

  // Invalidate all existing sessions for safety
  await lucia.invalidateUserSessions(record.userId);

  redirect("/login");
}
