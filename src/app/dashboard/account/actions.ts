"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentSession } from "@/lib/auth/session";
import { lucia } from "@/lib/auth/lucia";
import { recordAudit } from "@/lib/admin/audit";

// "Sign me out everywhere" — panic button for a lost device or suspected
// cookie theft. Invalidates every session row for the current user, so
// every other browser / device holding a valid cookie gets kicked on
// their next request. Then clears the local cookie too.
export async function signOutAllMyDevicesAction(): Promise<void> {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");

  await lucia.invalidateUserSessions(user.id);
  await recordAudit({
    actor: { id: user.id, username: user.username },
    action: "self.logout_all_sessions",
    targetUserId: user.id,
  });

  const cookieStore = await cookies();
  const blank = lucia.createBlankSessionCookie();
  cookieStore.set(blank.name, blank.value, blank.attributes);
  redirect("/login");
}
