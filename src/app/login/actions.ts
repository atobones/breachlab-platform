"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { lucia } from "@/lib/auth/lucia";
import { loginSchema } from "@/lib/validation/auth";

type State = { error: string | null };

const PENDING_2FA_COOKIE = "breachlab_pending_2fa";

export async function loginAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Invalid input" };

  const { username, password } = parsed.data;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) return { error: "Invalid credentials" };
  if (!(await verifyPassword(user.passwordHash, password))) {
    return { error: "Invalid credentials" };
  }

  const cookieStore = await cookies();

  if (user.totpSecret) {
    cookieStore.set(PENDING_2FA_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 5 * 60,
      path: "/",
    });
    redirect("/login/2fa");
  }

  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookieStore.set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(lucia.sessionCookieName)?.value;
  if (sessionId) {
    await lucia.invalidateSession(sessionId);
  }
  const blank = lucia.createBlankSessionCookie();
  cookieStore.set(blank.name, blank.value, blank.attributes);
  redirect("/login");
}

export async function verifyTwoFactorAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(PENDING_2FA_COOKIE)?.value;
  if (!userId) return { error: "Session expired, log in again" };

  const code = String(formData.get("code") ?? "");
  if (!/^\d{6}$/.test(code)) return { error: "Code must be 6 digits" };

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || !user.totpSecret) {
    return { error: "Account state changed, log in again" };
  }

  const { verifyTotp } = await import("@/lib/auth/totp");
  if (!(await verifyTotp(user.totpSecret, code))) {
    return { error: "Invalid code" };
  }

  cookieStore.delete(PENDING_2FA_COOKIE);
  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  cookieStore.set(
    sessionCookie.name,
    sessionCookie.value,
    sessionCookie.attributes
  );
  redirect("/dashboard");
}
