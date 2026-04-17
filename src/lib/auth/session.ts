import { cache } from "react";
import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { lucia } from "./lucia";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const LAST_SEEN_DEBOUNCE_SECONDS = 30;

export const getCurrentSession = cache(async () => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;
  if (!sessionId) return { user: null, session: null };

  const result = await lucia.validateSession(sessionId);

  try {
    if (result.session && result.session.fresh) {
      const sessionCookie = lucia.createSessionCookie(result.session.id);
      cookieStore.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );
    }
    if (!result.session) {
      const sessionCookie = lucia.createBlankSessionCookie();
      cookieStore.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );
    }
  } catch {
    // Server Component context — cookies cannot be set, ignore
  }

  if (result.user) {
    void touchLastSeen(result.user.id);
  }

  return result;
});

async function touchLastSeen(userId: string): Promise<void> {
  try {
    await db
      .update(users)
      .set({ lastSeenAt: sql`now()` })
      .where(
        sql`${users.id} = ${userId} AND (${users.lastSeenAt} IS NULL OR ${users.lastSeenAt} < now() - interval '${sql.raw(
          String(LAST_SEEN_DEBOUNCE_SECONDS)
        )} seconds')`
      );
  } catch {
    // last_seen is best-effort; never break auth over it
  }
}

