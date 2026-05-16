// Plain-JS twin of scrub-learning-resources-crackmes.ts — runnable via the
// web container's native node (no tsx / no devDeps required).
//
// Usage on prod (host has no node; web container does):
//   docker exec \
//     -e DISCORD_BOT_TOKEN \
//     -e DISCORD_GUILD_ID \
//     breachlab-platform-web-1 \
//     node /tmp/scrub-learning-resources-crackmes.mjs
//
// (docker cp the file into /tmp first, or rebuild to bake it in.)

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

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      "Content-Type": "application/json",
      "X-Audit-Log-Reason":
        "BreachLab scrub-learning-resources-crackmes (no-competitor-link policy)",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status} ${text}`);
  }
  return res;
}

async function findChannel() {
  const res = await api("GET", `/guilds/${GUILD}/channels`);
  const channels = await res.json();
  const hit = channels.find((c) => c.name === CHANNEL_NAME);
  if (!hit) {
    throw new Error(`#${CHANNEL_NAME} not found in guild ${GUILD}`);
  }
  return hit;
}

async function findMessage(channelId) {
  const res = await api(
    "GET",
    `/channels/${channelId}/messages?limit=100`,
  );
  const messages = await res.json();
  return (
    messages.find(
      (m) => m.author?.bot && m.content.includes(MESSAGE_MARKER),
    ) ?? null
  );
}

function scrub(content) {
  const lines = content.split("\n");
  const kept = lines.filter(
    (line) =>
      !(line.trimStart().startsWith("•") && line.includes(DOOMED_FRAGMENT)),
  );
  return kept.join("\n");
}

async function main() {
  const channel = await findChannel();
  console.log(`→ #${channel.name} (${channel.id})`);

  const msg = await findMessage(channel.id);
  if (!msg) {
    console.error(
      `No bot message containing "${MESSAGE_MARKER}" in recent history.`,
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
      "Doomed fragment present but scrub() didn't drop a bullet — bailing.",
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
