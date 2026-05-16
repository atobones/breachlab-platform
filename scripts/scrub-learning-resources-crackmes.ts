/**
 * One-shot: scrub the crackmes.one bullet from the
 * "malware analysis & reverse engineering" bot message in #learning-resources.
 *
 * Boss policy: we don't link to competing CTF / RE-challenge platforms from
 * our own learning material. Educational references (blogs, workshops,
 * archives, tools, books) stay; "go solve their puzzles" sites go.
 *
 * Usage:
 *   DISCORD_BOT_TOKEN=... DISCORD_GUILD_ID=... \
 *     npx tsx scripts/scrub-learning-resources-crackmes.ts
 *
 * Idempotent — if the line is already gone, the script reports "nothing to do"
 * and exits 0.
 */

const API = "https://discord.com/api/v10";
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD = process.env.DISCORD_GUILD_ID;
const CHANNEL_NAME = "learning-resources";
const MESSAGE_MARKER = "malware analysis & reverse engineering";
const DOOMED_FRAGMENT = "crackmes.one";

if (!TOKEN || !GUILD) {
  console.error(
    "Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID environment variables.",
  );
  process.exit(1);
}

type Channel = { id: string; name: string; type: number };
type Message = {
  id: string;
  content: string;
  author: { id: string; bot?: boolean };
};

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
      "X-Audit-Log-Reason":
        "BreachLab scrub-learning-resources-crackmes.ts (no-competitor-link policy)",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status} ${text}`);
  }
  return res;
}

async function findChannel(): Promise<Channel> {
  const res = await api("GET", `/guilds/${GUILD}/channels`);
  const channels = (await res.json()) as Channel[];
  const hit = channels.find((c) => c.name === CHANNEL_NAME);
  if (!hit) {
    throw new Error(`#${CHANNEL_NAME} not found in guild ${GUILD}`);
  }
  return hit;
}

async function findMessage(channelId: string): Promise<Message | null> {
  // Walk recent messages — the malware analysis post is one of ~10 topical
  // posts in this channel, so 100 msgs of lookback is overkill but cheap.
  const res = await api(
    "GET",
    `/channels/${channelId}/messages?limit=100`,
  );
  const messages = (await res.json()) as Message[];
  return (
    messages.find(
      (m) => m.author?.bot && m.content.includes(MESSAGE_MARKER),
    ) ?? null
  );
}

function scrub(content: string): string {
  // Drop the bullet line referencing crackmes.one. Match a leading "• "
  // bullet that contains the doomed fragment, including its trailing newline.
  const lines = content.split("\n");
  const kept = lines.filter(
    (line) => !(line.trimStart().startsWith("•") && line.includes(DOOMED_FRAGMENT)),
  );
  return kept.join("\n");
}

async function main(): Promise<void> {
  const channel = await findChannel();
  console.log(`→ #${channel.name} (${channel.id})`);

  const msg = await findMessage(channel.id);
  if (!msg) {
    console.error(
      `No bot message containing "${MESSAGE_MARKER}" in recent history. ` +
        `Widen the lookback if it scrolled off.`,
    );
    process.exit(2);
  }
  console.log(`→ found message ${msg.id} (${msg.content.length} chars)`);

  if (!msg.content.includes(DOOMED_FRAGMENT)) {
    console.log("Nothing to do — crackmes.one line already absent.");
    return;
  }

  const next = scrub(msg.content);
  if (next === msg.content) {
    console.log(
      "Doomed fragment present but scrub() didn't drop a bullet — bailing " +
        "instead of editing blindly. Inspect the message format.",
    );
    process.exit(3);
  }

  await api("PATCH", `/channels/${channel.id}/messages/${msg.id}`, {
    content: next,
  });
  console.log(
    `✓ message edited: ${msg.content.length} → ${next.length} chars (-${
      msg.content.length - next.length
    })`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
