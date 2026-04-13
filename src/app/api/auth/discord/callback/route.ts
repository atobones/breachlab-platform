import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { discordOauthStates, users } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";
import { exchangeCode, fetchUser, isConfigured } from "@/lib/discord/oauth";

const TEN_MINUTES_MS = 10 * 60 * 1000;

function redirect(path: string): NextResponse {
  const site = process.env.SITE_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${site}${path}`);
}

export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Discord not configured" },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return redirect("/dashboard?discord=error");

  const [stateRow] = await db
    .select()
    .from(discordOauthStates)
    .where(eq(discordOauthStates.state, state))
    .limit(1);

  if (!stateRow) return redirect("/dashboard?discord=invalid_state");

  await db
    .delete(discordOauthStates)
    .where(eq(discordOauthStates.state, state));

  const age = Date.now() - stateRow.createdAt.getTime();
  if (age > TEN_MINUTES_MS) {
    return redirect("/dashboard?discord=invalid_state");
  }

  const { user } = await getCurrentSession();
  if (!user || user.id !== stateRow.userId) {
    return redirect("/dashboard?discord=error");
  }

  let discordUser: { id: string; username: string };
  try {
    const { accessToken } = await exchangeCode(code);
    discordUser = await fetchUser(accessToken);
  } catch {
    return redirect("/dashboard?discord=error");
  }

  const [conflict] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.discordId, discordUser.id))
    .limit(1);
  if (conflict && conflict.id !== user.id) {
    return redirect("/dashboard?discord=conflict");
  }

  await db
    .update(users)
    .set({ discordId: discordUser.id, discordUsername: discordUser.username })
    .where(eq(users.id, user.id));

  return redirect("/dashboard?discord=linked");
}
