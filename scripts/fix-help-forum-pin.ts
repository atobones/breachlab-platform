/**
 * Fix pinned message in #help-forum channel.
 *
 * The original pinned message contains "<#NONEXISTENT_CHANNEL_ID>" — Discord
 * renders this as a localized "unknown" / "неизвестно" placeholder when the
 * channel ID can't be resolved. This script finds the broken mention and
 * replaces it with plaintext "server rule #1" so it survives channel
 * renames/deletes and doesn't render localized garbage in non-English clients.
 *
 * Usage:
 *   DISCORD_BOT_TOKEN=... npx tsx scripts/fix-help-forum-pin.ts
 */

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const HELP_FORUM_CHANNEL_ID = "1501145856005505065";

if (!TOKEN) {
  console.error("Set DISCORD_BOT_TOKEN");
  process.exit(1);
}

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: {
      "Authorization": `Bot ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${path}: ${body}`);
  }
  return res.json();
}

async function getPinnedMessages(channelId: string) {
  // Forum channels: the pin lives on the forum's first post (the pinned thread's starter message)
  // For a regular text channel use /channels/:id/pins
  // Try the v10 pins endpoint first; if 0 results, list active threads (forum starters).
  const pins = await api(`/channels/${channelId}/pins`);
  if (Array.isArray(pins) && pins.length > 0) return pins;

  // Forum channels: pinned posts are listed via the threads/active or guild forum
  // Fallback: pull recent active threads
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return [];
  const threads = await api(`/guilds/${guildId}/threads/active`);
  const forumThreads = (threads.threads ?? []).filter(
    (t: any) => t.parent_id === channelId,
  );
  // For each thread, fetch first message (the OP)
  const results: any[] = [];
  for (const t of forumThreads) {
    try {
      const msg = await api(`/channels/${t.id}/messages/${t.id}`);
      results.push(msg);
    } catch (_) {
      /* skip */
    }
  }
  return results;
}

function fixContent(content: string): string {
  // Replace any unresolved channel mention near "rule #1" with plaintext.
  // Pattern: "(see <#DIGITS>, rule #1)" → "(against server rule #1)"
  let fixed = content.replace(
    /\(see <#\d+>,\s*rule #1\)/gi,
    "(against server rule #1)",
  );
  // Also handle the case with no preceding "see" keyword.
  fixed = fixed.replace(/<#\d+>,\s*rule #1/gi, "server rule #1");
  return fixed;
}

async function main() {
  console.log(`Fetching pinned/forum-starter messages in ${HELP_FORUM_CHANNEL_ID}...`);
  const messages = await getPinnedMessages(HELP_FORUM_CHANNEL_ID);
  console.log(`Found ${messages.length} candidate message(s).`);

  for (const m of messages) {
    if (!m?.content) continue;
    const original = m.content as string;
    const fixed = fixContent(original);
    if (fixed === original) {
      console.log(`  - skip ${m.id} (no broken mention found)`);
      continue;
    }
    console.log(`  - patching ${m.id}`);
    console.log(`    BEFORE: ${original.slice(0, 200).replace(/\n/g, " ⏎ ")}`);
    console.log(`    AFTER:  ${fixed.slice(0, 200).replace(/\n/g, " ⏎ ")}`);
    await api(`/channels/${m.channel_id}/messages/${m.id}`, {
      method: "PATCH",
      body: JSON.stringify({ content: fixed }),
    });
    console.log(`    ✓ patched`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
