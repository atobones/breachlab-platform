/**
 * One-shot script that brings the BreachLab Discord server into its
 * launch-ready shape. Idempotent — re-running is safe.
 *
 * What it does (via Discord REST API, bot token):
 *   1. Creates two new roles if missing: "Recruit" and "Operative"
 *   2. Creates 5 categories if missing: INFO, COMMUNITY, TRACKS, HELP, META
 *   3. Creates ~16 channels inside those categories if missing
 *   4. Sets permission overwrites so each channel's access matches the plan
 *   5. Prints copy-pasteable welcome/rules text at the end
 *
 * What it does NOT do (needs the server owner in the Discord UI):
 *   - Enable Community (Settings → Enable Community) — one click
 *   - Configure Welcome Screen — Settings → Welcome Screen
 *   - Configure AutoMod rules — Settings → AutoMod
 *   - Set verification level — Settings → Safety Setup
 *
 * Usage:
 *   DISCORD_BOT_TOKEN=... DISCORD_GUILD_ID=... npx tsx scripts/setup-discord-server.ts
 *
 * Env vars:
 *   DISCORD_BOT_TOKEN   — bot token with MANAGE_CHANNELS + MANAGE_ROLES
 *   DISCORD_GUILD_ID    — target guild ID
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

type Channel = {
  id: string;
  name: string;
  type: number;
  parent_id: string | null;
  position: number;
};

type Role = { id: string; name: string; position: number; permissions: string };

async function api(
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      "Content-Type": "application/json",
      "X-Audit-Log-Reason": "BreachLab setup-discord-server.ts",
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

async function createRole(name: string, color: number): Promise<Role> {
  const res = await api("POST", `/guilds/${GUILD}/roles`, {
    name,
    color,
    hoist: true,
    mentionable: false,
    permissions: "0",
  });
  return (await res.json()) as Role;
}

async function ensureRole(
  name: string,
  color: number,
  roles: Role[],
): Promise<Role> {
  const existing = roles.find((r) => r.name === name);
  if (existing) {
    console.log(`  role "${name}" already exists (${existing.id})`);
    return existing;
  }
  const r = await createRole(name, color);
  console.log(`  role "${name}" CREATED (${r.id})`);
  return r;
}

const CHANNEL_TYPE = { TEXT: 0, VOICE: 2, CATEGORY: 4 } as const;

type OverwriteInput = {
  id: string;
  type: 0 | 1; // 0 = role, 1 = member
  allow?: string;
  deny?: string;
};

async function ensureChannel(
  name: string,
  type: number,
  parentId: string | null,
  channels: Channel[],
  overwrites: OverwriteInput[] = [],
  topic?: string,
): Promise<Channel> {
  const existing = channels.find(
    (c) => c.name === name && c.parent_id === parentId && c.type === type,
  );
  if (existing) {
    console.log(`  channel "${name}" already exists (${existing.id})`);
    // Update permission overwrites to be idempotent on re-runs
    if (overwrites.length > 0) {
      await api("PATCH", `/channels/${existing.id}`, {
        permission_overwrites: overwrites,
        ...(topic ? { topic } : {}),
      });
    }
    return existing;
  }
  const body: Record<string, unknown> = {
    name,
    type,
    permission_overwrites: overwrites,
  };
  if (parentId) body.parent_id = parentId;
  if (topic) body.topic = topic;
  const res = await api("POST", `/guilds/${GUILD}/channels`, body);
  const ch = (await res.json()) as Channel;
  console.log(`  channel "${name}" CREATED (${ch.id})`);
  return ch;
}

async function main() {
  console.log("━━━ BreachLab Discord setup ━━━");

  // --- Roles -----------------------------------------------------------
  console.log("\n▸ Roles");
  let roles = await listRoles();
  const recruit = await ensureRole("Recruit", 0x94a3b8, roles);  // slate
  const operative = await ensureRole("Operative", 0xf59e0b, roles); // amber
  roles = await listRoles();

  const everyoneId = GUILD!; // @everyone role id == guild id
  const supporter = roles.find((r) => r.name === "Supporter");
  const firstBlood = roles.find((r) => r.name === "First Blood");
  const ghostMaster = roles.find((r) => r.name === "Ghost Master");
  const phantomOp = roles.find((r) => r.name === "Phantom Operative");
  const botAdmin = roles.find((r) => r.name === "BotAdmin");

  if (!supporter || !firstBlood || !ghostMaster || !phantomOp || !botAdmin) {
    throw new Error("Missing one of the operator/bot roles created earlier");
  }

  // --- Permission bit constants ----------------------------------------
  const VIEW_CHANNEL = 1 << 10;
  const SEND_MESSAGES = 1 << 11;
  const EMBED_LINKS = 1 << 14;
  const ATTACH_FILES = 1 << 15;
  const ADD_REACTIONS = 1 << 6;
  const READ_HISTORY = 1 << 16;
  const USE_APP_COMMANDS = 1 << 31;
  const CONNECT = 1 << 20;
  const SPEAK = 1 << 21;

  // Operative can post in text channels
  const TEXT_ALLOW = (
    VIEW_CHANNEL | SEND_MESSAGES | EMBED_LINKS | ATTACH_FILES |
    ADD_REACTIONS | READ_HISTORY | USE_APP_COMMANDS
  ).toString();
  // Recruit can only read (not post)
  const TEXT_READ_ONLY = (VIEW_CHANNEL | READ_HISTORY).toString();
  // Deny view
  const VIEW_DENY = VIEW_CHANNEL.toString();
  // Voice allow
  const VOICE_ALLOW = (VIEW_CHANNEL | CONNECT | SPEAK).toString();

  // --- Channel plan ----------------------------------------------------
  console.log("\n▸ Categories + channels");
  const channels = await listChannels();

  async function category(name: string) {
    return ensureChannel(name, CHANNEL_TYPE.CATEGORY, null, channels);
  }

  async function text(
    name: string,
    parent: Channel,
    mode: "public-readonly" | "public-talk" | "announce-only" | "operative-only",
    topic?: string,
  ) {
    const overwrites: OverwriteInput[] = [];
    if (mode === "public-readonly") {
      // everyone reads, recruit reads, operative reads (no one writes)
      overwrites.push({
        id: everyoneId,
        type: 0,
        deny: SEND_MESSAGES.toString(),
      });
    } else if (mode === "announce-only") {
      overwrites.push({
        id: everyoneId,
        type: 0,
        deny: SEND_MESSAGES.toString(),
      });
      // bot admin can post via webhook or manual override
      overwrites.push({
        id: botAdmin!.id,
        type: 0,
        allow: SEND_MESSAGES.toString(),
      });
    } else if (mode === "public-talk") {
      // Recruit read-only, Operative posts
      overwrites.push({
        id: everyoneId,
        type: 0,
        deny: SEND_MESSAGES.toString(),
      });
      overwrites.push({
        id: operative.id,
        type: 0,
        allow: TEXT_ALLOW,
      });
    } else if (mode === "operative-only") {
      // Hide from Recruit, only Operative+ sees
      overwrites.push({
        id: everyoneId,
        type: 0,
        deny: VIEW_DENY,
      });
      overwrites.push({
        id: recruit.id,
        type: 0,
        deny: VIEW_DENY,
      });
      overwrites.push({
        id: operative.id,
        type: 0,
        allow: TEXT_ALLOW,
      });
    }
    return ensureChannel(
      name,
      CHANNEL_TYPE.TEXT,
      parent.id,
      channels,
      overwrites,
      topic,
    );
  }

  async function voice(name: string, parent: Channel) {
    return ensureChannel(
      name,
      CHANNEL_TYPE.VOICE,
      parent.id,
      channels,
      [
        { id: everyoneId, type: 0, allow: VOICE_ALLOW },
      ],
    );
  }

  // INFO — visible to everyone, read-only except announcements
  const info = await category("INFO");
  await text("welcome", info, "public-readonly", "Start here. What BreachLab is and how to use this server.");
  await text("rules", info, "public-readonly", "Server rules. Read before posting.");
  await text("announcements", info, "announce-only", "New tracks, CVE advisories, launches.");
  await text("changelog", info, "announce-only", "Platform release notes.");

  // COMMUNITY — Recruit reads, Operative posts
  const community = await category("COMMUNITY");
  await text("general", community, "public-talk", "Open chat. English preferred.");
  await text("introductions", community, "public-talk", "New here? Say hi and what brought you.");
  await text("victories", community, "public-talk", "Celebrate level clears, first bloods, graduations.");
  await text("off-topic", community, "public-talk", "Not about hacking. Keep it chill.");

  // TRACKS — one channel per active track
  const tracks = await category("TRACKS");
  await text("ghost-track", tracks, "public-talk", "Ghost track — Linux & shell fundamentals. NO SPOILERS for level answers.");
  await text("phantom-track", tracks, "public-talk", "Phantom track — privesc, container escape, K8s. NO SPOILERS.");
  await text("spoiler-zone", tracks, "operative-only", "Full spoilers OK. Only operatives (cleared at least one public level) can see this.");

  // HELP — operatives help recruits
  const help = await category("HELP");
  await text("help", help, "public-talk", "Stuck? Ask here. No solutions — only nudges and conceptual help.");
  await text("bugs", help, "public-talk", "Platform bugs, broken SSH, down flags. Be specific.");

  // META
  const meta = await category("META");
  await text("feedback", meta, "public-talk", "What we should improve.");
  await text("suggestions", meta, "public-talk", "Feature requests. Vote with reactions.");

  // VOICE
  const voiceCat = await category("VOICE");
  await voice("general-voice", voiceCat);
  await voice("focus-quiet", voiceCat);

  console.log("\n✅ Done");

  // --- Welcome / rules content for manual paste ------------------------
  console.log("\n━━━ Copy-paste this into #welcome ━━━");
  console.log(`
**Welcome to BreachLab**
The free, hardcore wargame series for learning real security tradecraft. No hand-holding, no CTF theatre. A terminal, a goal, and the knowledge that you earned your way through.

**Where to start**
• Register at https://breachlab.org
• Read the rules in <#RULES_CHANNEL_ID>
• Start the Ghost track — it is the foundation for everything else
• Ask questions in <#HELP_CHANNEL_ID>

**Tracks live right now**
• **Ghost** — 22 public levels + 1 hidden graduation. Linux and shell fundamentals.
• **Phantom** — 20 public levels + 1 hidden graduation. Linux privilege escalation, container escape, Kubernetes pod escape.

**What you earn**
• Per-level points and first-blood bonuses
• Operative Certificate with a unique serial, shareable publicly
• Discord roles (Supporter / First Blood / Ghost Master / Phantom Operative)
• A place on the public Honor Roll

Good luck, operative.
`);

  console.log("\n━━━ Copy-paste this into #rules ━━━");
  console.log(`
**BreachLab Server Rules**

**1. No spoilers.** Never post level solutions, flag values, or step-by-step walkthroughs in public channels. Talk about concepts, not answers. If you must discuss a solution, use #spoiler-zone (only visible to operatives who have cleared at least one level).

**2. Be kind to beginners.** Everyone was new once. Push people toward "the man page" or "read the level description again," not the answer.

**3. No cheating.** Submitting flags you did not earn yourself is pointless. You are only wasting your own time.

**4. No self-promotion.** No courses, no consultancies, no affiliate links. This is not a billboard.

**5. Use English in public channels.** International community. Exceptions: introductions can be in any language.

**6. Report abuse, don't engage.** Use the Report Message flow or ping @Admin.

**7. Platform security bugs** go in #bugs and via private message to an admin. Do not weaponize them against the platform.

Violations → warning → temporary mute → ban. Admin decisions are final.
`);

  process.exit(0);
}

main().catch((err) => {
  console.error("\n✗ setup failed:", err.message);
  process.exit(1);
});
