/**
 * One-shot remediation script — fixes the launch-day Discord permission bug
 * where new joiners couldn't write in any channel because:
 *   - The `public-talk` channels (general, intros, victories, help, bugs, etc.)
 *     denied SEND_MESSAGES on @everyone and only allowed it on Operative.
 *   - Discord doesn't auto-assign Recruit on join, so new members landed as
 *     bare @everyone and silently bounced off into DMs.
 *
 * What this script does (idempotent — re-running is safe):
 *   1. Patches every channel currently in `public-talk` mode to ALSO allow
 *      @everyone SEND_MESSAGES. New joiners can chat in general/help/etc.
 *      Operative still gets explicit allow (covers any future tightening).
 *   2. Backfills the Recruit role on every existing member who doesn't have
 *      Recruit OR Operative yet. Cosmetic + future-proof if we re-tighten.
 *   3. Prints a summary table at the end.
 *
 * What this does NOT do (still needs the server owner in the Discord UI):
 *   - Enable Onboarding (Server Settings → Onboarding) so new joiners get
 *     Recruit automatically going forward. Without this, Recruit backfill
 *     covers existing members but new ones still land as @everyone (still
 *     fine for chat after step 1, but the role is nicer for stats/badges).
 *
 * Channels that REMAIN restricted (intentional):
 *   - announcements / changelog → announce-only
 *   - welcome / rules → public-readonly
 *   - spoiler-zone → operative-only (this is the whole point of Operative)
 *
 * Usage:
 *   DISCORD_BOT_TOKEN=... DISCORD_GUILD_ID=... npx tsx scripts/fix-discord-permissions.ts
 */

const API = "https://discord.com/api/v10";
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !GUILD) {
  console.error(
    "Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID environment variables.",
  );
  process.exit(1);
}

const VIEW_CHANNEL = 1n << 10n;
const SEND_MESSAGES = 1n << 11n;
const READ_HISTORY = 1n << 16n;
const EMBED_LINKS = 1n << 14n;
const ATTACH_FILES = 1n << 15n;
const ADD_REACTIONS = 1n << 6n;

// Channels we want @everyone to chat in (the core community spaces).
// Match by the trailing slug — Discord names look like "💬・general",
// "👻・ghost", etc. We normalize to the part after the `・` separator.
const OPEN_CHAT_CHANNELS = new Set([
  "general",
  "introductions",
  "victories",
  "off-topic",
  "ghost",
  "phantom",
  "help",
  "bugs",
  "feedback",
  "suggestions",
]);

function channelSlug(name: string): string {
  // Strip emoji prefix + Discord's "・" separator if present.
  const parts = name.split("・");
  return (parts.length > 1 ? parts[parts.length - 1] : name).trim().toLowerCase();
}

type Role = { id: string; name: string };
type Member = {
  user?: { id: string; username: string; bot?: boolean };
  roles: string[];
};
type Overwrite = { id: string; type: number; allow: string; deny: string };
type Channel = {
  id: string;
  name: string;
  type: number;
  permission_overwrites: Overwrite[];
};

async function api(method: string, path: string, body?: unknown): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      "Content-Type": "application/json",
      "X-Audit-Log-Reason": "BreachLab fix-discord-permissions.ts",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status} ${text}`);
  }
  return res;
}

async function listRoles(): Promise<Role[]> {
  const res = await api("GET", `/guilds/${GUILD}/roles`);
  return (await res.json()) as Role[];
}

async function listChannels(): Promise<Channel[]> {
  const res = await api("GET", `/guilds/${GUILD}/channels`);
  return (await res.json()) as Channel[];
}

async function listMembers(): Promise<Member[]> {
  const out: Member[] = [];
  let after = "0";
  for (;;) {
    const res = await api("GET", `/guilds/${GUILD}/members?limit=1000&after=${after}`);
    const batch = (await res.json()) as Member[];
    if (batch.length === 0) break;
    out.push(...batch);
    after = batch[batch.length - 1].user?.id ?? "0";
    if (batch.length < 1000) break;
  }
  return out;
}

async function patchChannelOverwrite(
  channelId: string,
  overwriteId: string,
  type: number,
  allow: bigint,
  deny: bigint,
): Promise<void> {
  await api("PUT", `/channels/${channelId}/permissions/${overwriteId}`, {
    type,
    allow: allow.toString(),
    deny: deny.toString(),
  });
}

async function addMemberRole(memberId: string, roleId: string): Promise<void> {
  await api("PUT", `/guilds/${GUILD}/members/${memberId}/roles/${roleId}`);
}

async function main() {
  console.log("=== fix-discord-permissions ===\n");

  const roles = await listRoles();
  const recruit = roles.find((r) => r.name === "Recruit");
  const operative = roles.find((r) => r.name === "Operative");
  if (!recruit || !operative) {
    console.error("Missing Recruit or Operative role. Run setup-discord-server.ts first.");
    process.exit(1);
  }
  console.log(`Recruit role:   ${recruit.id}`);
  console.log(`Operative role: ${operative.id}\n`);

  // ── Step 1: open up the chat channels for @everyone ────────────────────
  const channels = await listChannels();
  const everyoneId = GUILD!;
  let opened = 0;
  console.log("→ opening chat channels for @everyone...");
  for (const ch of channels) {
    const slug = channelSlug(ch.name);
    if (!OPEN_CHAT_CHANNELS.has(slug)) continue;
    // Allow @everyone to send + react + read history. Clear the SEND deny.
    await patchChannelOverwrite(
      ch.id,
      everyoneId,
      0,
      VIEW_CHANNEL | SEND_MESSAGES | READ_HISTORY | EMBED_LINKS | ATTACH_FILES | ADD_REACTIONS,
      0n,
    );
    console.log(`  ✓ #${ch.name} (slug: ${slug})`);
    opened++;
  }
  console.log(`  total: ${opened} channels opened\n`);

  // ── Step 2: backfill Recruit role on members who have neither role ─────
  console.log("→ backfilling Recruit role on existing members...");
  const members = await listMembers();
  let backfilled = 0;
  let skippedBots = 0;
  let alreadyHasRole = 0;
  for (const m of members) {
    if (!m.user || m.user.bot) {
      if (m.user?.bot) skippedBots++;
      continue;
    }
    const has = m.roles.includes(recruit.id) || m.roles.includes(operative.id);
    if (has) {
      alreadyHasRole++;
      continue;
    }
    try {
      await addMemberRole(m.user.id, recruit.id);
      console.log(`  + ${m.user.username} → Recruit`);
      backfilled++;
    } catch (e) {
      console.error(`  ! failed for ${m.user.username}: ${(e as Error).message}`);
    }
  }
  console.log(
    `  total: ${backfilled} backfilled, ${alreadyHasRole} already had role, ${skippedBots} bots skipped\n`,
  );

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log("=== DONE ===");
  console.log(`Channels opened:     ${opened}`);
  console.log(`Members backfilled:  ${backfilled}`);
  console.log("");
  console.log("Next: enable Discord Onboarding so new joiners auto-get Recruit:");
  console.log("  Server Settings → Onboarding → Enable → set Recruit as default role.");
  console.log(
    "  (Even without this, new joiners can chat in #general now via @everyone permission.)",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
