import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db/client";
import { discordOauthStates } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";
import { buildAuthUrl, isConfigured } from "@/lib/discord/oauth";

export async function GET() {
  const { user } = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Discord not configured" },
      { status: 503 },
    );
  }

  const state = randomBytes(16).toString("hex");
  await db.insert(discordOauthStates).values({ state, userId: user.id });
  return NextResponse.redirect(buildAuthUrl(state));
}
