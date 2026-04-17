import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";
import { verifyTotp } from "@/lib/auth/totp";

export type Actor = { id: string; username: string };

// Basic gate — used for read-only admin views.
export async function requireAdmin(): Promise<
  { actor: Actor } | { error: string }
> {
  const { user } = await getCurrentSession();
  if (!user || !user.isAdmin || !user.totpEnabled) {
    return { error: "unauthorized" };
  }
  return { actor: { id: user.id, username: user.username } };
}

// Stricter gate — for mutations (promote/demote/reset/delete/logout-all).
// Requires a fresh TOTP code. The login-time TOTP is not enough: once the
// session cookie exists, a stolen cookie otherwise lets an attacker run
// every admin mutation with no second factor. Forcing a fresh code on
// every critical call means they'd also need the authenticator app.
export async function requireAdminWithTotp(
  totpCode: string | null | undefined
): Promise<{ actor: Actor } | { error: string }> {
  const base = await requireAdmin();
  if ("error" in base) return base;

  if (!totpCode || !/^\d{6}$/.test(totpCode)) {
    return { error: "totp code required" };
  }
  const [row] = await db
    .select({ secret: users.totpSecret })
    .from(users)
    .where(eq(users.id, base.actor.id));
  if (!row?.secret) return { error: "totp not enrolled" };
  if (!(await verifyTotp(row.secret, totpCode))) {
    return { error: "invalid totp code" };
  }
  return base;
}
