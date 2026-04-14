import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { badges, users } from "@/lib/db/schema";
import { discordBotFetch, hasBotToken } from "./client";
import { computeExpectedRoles, type RoleIds } from "./roles";

function roleIdsFromEnv(): RoleIds {
  return {
    operative: process.env.DISCORD_ROLE_OPERATIVE || null,
    supporter: process.env.DISCORD_ROLE_SUPPORTER || null,
    firstBlood: process.env.DISCORD_ROLE_FIRST_BLOOD || null,
    ghostMaster: process.env.DISCORD_ROLE_GHOST_MASTER || null,
    phantomOperative: process.env.DISCORD_ROLE_PHANTOM_OPERATIVE || null,
  };
}

function guildId(): string | null {
  return process.env.DISCORD_GUILD_ID || null;
}

export async function syncUserRoles(userId: string): Promise<void> {
  if (!hasBotToken() || !guildId()) {
    throw new Error("discord bot not fully configured");
  }

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      discordId: users.discordId,
      isSupporter: users.isSupporter,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.discordId) return;

  const userBadges = await db
    .select({ kind: badges.kind })
    .from(badges)
    .where(eq(badges.userId, user.id));

  const hasFirstBlood = userBadges.some((b) => b.kind === "first_blood");
  const hasTrackComplete = userBadges.some((b) => b.kind === "track_complete");
  const hasGhostGraduate = userBadges.some((b) => b.kind === "ghost_graduate");
  const hasPhantomMaster = userBadges.some((b) => b.kind === "phantom_master");
  const ids = roleIdsFromEnv();
  const expected = new Set(
    computeExpectedRoles(
      {
        isSupporter: user.isSupporter,
        hasFirstBlood,
        hasTrackComplete,
        hasGhostGraduate,
        hasPhantomMaster,
      },
      ids,
    ),
  );

  const managed = new Set(
    [
      ids.operative,
      ids.supporter,
      ids.firstBlood,
      ids.ghostMaster,
      ids.phantomOperative,
    ].filter((id): id is string => Boolean(id)),
  );

  const memberRes = await discordBotFetch(
    `/guilds/${guildId()}/members/${user.discordId}`,
  );
  if (memberRes.status === 404) {
    // user not in guild — nothing to do
    return;
  }
  if (!memberRes.ok) {
    throw new Error(`discord member fetch failed: ${memberRes.status}`);
  }
  const member = (await memberRes.json()) as { roles: string[] };
  const current = new Set(member.roles);

  // Add missing expected roles
  for (const roleId of expected) {
    if (!current.has(roleId)) {
      const res = await discordBotFetch(
        `/guilds/${guildId()}/members/${user.discordId}/roles/${roleId}`,
        { method: "PUT" },
      );
      if (!res.ok && res.status !== 204) {
        throw new Error(`add role ${roleId} failed: ${res.status}`);
      }
    }
  }

  // Remove managed roles we no longer expect
  for (const roleId of managed) {
    if (current.has(roleId) && !expected.has(roleId)) {
      const res = await discordBotFetch(
        `/guilds/${guildId()}/members/${user.discordId}/roles/${roleId}`,
        { method: "DELETE" },
      );
      if (!res.ok && res.status !== 204) {
        throw new Error(`remove role ${roleId} failed: ${res.status}`);
      }
    }
  }
}

export async function syncAllUsers(): Promise<{
  synced: number;
  skipped: number;
  errors: number;
}> {
  const linked = await db
    .select({ id: users.id, username: users.username })
    .from(users);

  let synced = 0;
  let skipped = 0;
  let errors = 0;
  for (const u of linked) {
    try {
      const [row] = await db
        .select({ discordId: users.discordId })
        .from(users)
        .where(eq(users.id, u.id))
        .limit(1);
      if (!row?.discordId) {
        skipped++;
        continue;
      }
      await syncUserRoles(u.id);
      synced++;
    } catch (err) {
      console.error(`[sync] ${u.username}:`, err);
      errors++;
    }
  }
  return { synced, skipped, errors };
}
