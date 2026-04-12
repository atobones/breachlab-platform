"use server";

import { redirect } from "next/navigation";
import { eq, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { users, emailVerifications } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/email/send";
import { registerSchema } from "@/lib/validation/auth";
import { lucia } from "@/lib/auth/lucia";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type State = { error: string | null };

export async function registerAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { username, email, password } = parsed.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.username, username), eq(users.email, email)))
    .limit(1);
  if (existing.length > 0) {
    return { error: "Username or email already in use" };
  }

  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(users)
    .values({ username, email, passwordHash })
    .returning({ id: users.id });

  const token = generateToken();
  const tokenHash = await hashToken(token);
  await db.insert(emailVerifications).values({
    userId: created.id,
    tokenHash,
    expiresAt: new Date(Date.now() + ONE_DAY_MS),
  });

  await sendVerificationEmail(email, token);

  const session = await lucia.createSession(created.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  const cookieStore = await cookies();
  cookieStore.set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );

  redirect("/dashboard");
}
