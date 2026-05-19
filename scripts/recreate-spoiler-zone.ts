/**
 * Recreate the #spoiler-zone channel under the TRACKS category with
 * operative-only permissions (Operative role can view + post; everyone
 * else, including Recruit, cannot view).
 *
 * Idempotent: if a channel named "spoiler-zone" already exists in TRACKS,
 * this script just re-applies the permission overwrites and exits.
 *
 * Usage:
 *   DISCORD_BOT_TOKEN=... DISCORD_GUILD_ID=... npx tsx scripts/recreate-spoiler-zone.ts
 */

const API = "https://discord.com/api/v10";
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !GUILD) {
  console.error("Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID");
  process.exit(1);
}

type Channel = {
  id: string;
  name: string;
  type: number;
  parent_id: string | null;
};
type Role = { id: string; name: string };

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      "Content-Type": "application/json",
      "X-Audit-Log-Reason": "Recreate spoiler-zone (accidental delete)",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
  }
  return res;
}

async function main() {
  const VIEW_CHANNEL = 1 << 10;
  const SEND_MESSAGES = 1 << 11;
  const EMBED_LINKS = 1 << 14;
  const ATTACH_FILES = 1 << 15;
  const ADD_REACTIONS = 1 << 6;
  const READ_HISTORY = 1 << 16;
  const USE_APP_COMMANDS = 1 << 31;

  const TEXT_ALLOW = (
    VIEW_CHANNEL | SEND_MESSAGES | EMBED_LINKS | ATTACH_FILES |
    ADD_REACTIONS | READ_HISTORY | USE_APP_COMMANDS
  ).toString();
  const VIEW_DENY = VIEW_CHANNEL.toString();

  const roles = (await (await api("GET", `/guilds/${GUILD}/roles`)).json()) as Role[];
  const operative = roles.find((r) => r.name === "Operative");
  const recruit = roles.find((r) => r.name === "Recruit");
  if (!operative) throw new Error("Operative role not found");
  if (!recruit) throw new Error("Recruit role not found");

  const channels = (await (await api("GET", `/guilds/${GUILD}/channels`)).json()) as Channel[];
  const tracks = channels.find((c) => c.type === 4 && c.name === "TRACKS");
  if (!tracks) throw new Error("TRACKS category not found");

  const overwrites = [
    { id: GUILD!, type: 0, deny: VIEW_DENY },
    { id: recruit.id, type: 0, deny: VIEW_DENY },
    { id: operative.id, type: 0, allow: TEXT_ALLOW },
  ];

  const existing = channels.find(
    (c) => c.type === 0 && c.name === "spoiler-zone" && c.parent_id === tracks.id,
  );
  const topic = "Full spoilers OK. Only operatives (cleared at least one public level) can see this.";

  if (existing) {
    await api("PATCH", `/channels/${existing.id}`, {
      permission_overwrites: overwrites,
      topic,
    });
    console.log(`spoiler-zone exists (${existing.id}); permissions re-applied`);
    return;
  }

  const res = await api("POST", `/guilds/${GUILD}/channels`, {
    name: "spoiler-zone",
    type: 0,
    parent_id: tracks.id,
    topic,
    permission_overwrites: overwrites,
  });
  const ch = (await res.json()) as Channel;
  console.log(`spoiler-zone CREATED (${ch.id}) under TRACKS, operative-only`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
