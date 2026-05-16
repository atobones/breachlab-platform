// Discord Crown Champion role rotation — one player at a time.
//
// On every successful round_winner award, the bot is asked to:
//   1. find all guild members currently carrying the role
//   2. remove it from everyone except the new winner
//   3. add it to the new winner
//
// The role visibly hoists the current champion in the Discord member
// list until the next round closes. Fire-and-forget; failures are
// logged but never bubble to the daemon's POST timeline.
//
// Dependencies (read at call time, not module load):
//   DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_ROLE_CROWN_CHAMPION.
// If any are missing the function quietly no-ops — Discord-side flex
// is optional, the in-platform leaderboard / honors row is the
// canonical source of truth.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const API = "https://discord.com/api/v10";

function botHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
    "X-Audit-Log-Reason": "Crown Wars round_winner",
  };
}

async function discordApi(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN missing");
  const res = await fetch(`${API}${path}`, {
    method,
    headers: botHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

// Resolve a BL user_id to their linked Discord id. Returns null if
// the player hasn't OAuth-linked Discord — in that case we still
// award the honor and broadcast in-channel, just skip the role grant.
async function resolveDiscordId(userId: string): Promise<string | null> {
  const [u] = await db
    .select({ discordId: users.discordId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return u?.discordId ?? null;
}

// Find all members currently holding the role. Paginated; 1000 is
// the API max per page but our guild has < 100 members so one call
// covers it.
async function membersWithRole(
  guildId: string,
  roleId: string,
): Promise<string[]> {
  const data = (await discordApi(
    "GET",
    `/guilds/${guildId}/members?limit=1000`,
  )) as Array<{ user: { id: string }; roles: string[] }>;
  return data.filter((m) => m.roles.includes(roleId)).map((m) => m.user.id);
}

// Public entry — rotate the role to a new winner.
export async function rotateCrownChampionRole(
  winnerUserId: string,
): Promise<{ rotated: boolean; reason?: string }> {
  const guild = process.env.DISCORD_GUILD_ID;
  const roleId = process.env.DISCORD_ROLE_CROWN_CHAMPION;
  if (!guild || !roleId || !process.env.DISCORD_BOT_TOKEN) {
    return { rotated: false, reason: "discord-env-missing" };
  }
  const winnerDiscordId = await resolveDiscordId(winnerUserId);
  if (!winnerDiscordId) {
    return { rotated: false, reason: "winner-no-discord-link" };
  }
  try {
    const current = await membersWithRole(guild, roleId);
    const toRemove = current.filter((id) => id !== winnerDiscordId);
    // Strip from everyone else first so the role is single-holder
    // for the brief moment between the two writes.
    await Promise.allSettled(
      toRemove.map((id) =>
        discordApi(
          "DELETE",
          `/guilds/${guild}/members/${id}/roles/${roleId}`,
        ),
      ),
    );
    // Grant to the new winner. PUT is idempotent on Discord, so this
    // is a no-op if they already had it (back-to-back wins).
    await discordApi(
      "PUT",
      `/guilds/${guild}/members/${winnerDiscordId}/roles/${roleId}`,
    );
    return { rotated: true };
  } catch (e) {
    return {
      rotated: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}
