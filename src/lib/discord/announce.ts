/**
 * Discord announcement hooks — fire-and-forget bot messages for
 * platform events worth celebrating in the community server.
 *
 * Every function here swallows errors (logs them but never throws),
 * because Discord downtime or misconfiguration must NEVER block the
 * platform request that triggered the announcement.
 */

import { hasBotToken } from "./client";

const DISCORD_API = "https://discord.com/api/v10";

function victoriesChannel(): string | null {
  return process.env.DISCORD_CHANNEL_VICTORIES || null;
}

function announcementsChannel(): string | null {
  return process.env.DISCORD_CHANNEL_ANNOUNCEMENTS || null;
}

async function post(channelId: string, content: string): Promise<void> {
  if (!hasBotToken()) return;
  try {
    const res = await fetch(
      `${DISCORD_API}/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          allowed_mentions: { parse: [] },
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(
        `[discord-announce] post to ${channelId} failed: ${res.status} ${body.slice(0, 200)}`,
      );
    }
  } catch (err) {
    console.error("[discord-announce] fetch threw:", err);
  }
}

export async function announceFirstBlood(args: {
  username: string;
  trackSlug: string;
  levelIdx: number;
  levelTitle: string;
  points: number;
}): Promise<void> {
  const channel = victoriesChannel();
  if (!channel) return;
  const trackLabel =
    args.trackSlug === "ghost"
      ? "Ghost"
      : args.trackSlug === "phantom"
        ? "Phantom"
        : args.trackSlug;
  const msg =
    `🩸 **First Blood** — **@${args.username}** took the first kill on ` +
    `**${trackLabel} L${args.levelIdx}: ${args.levelTitle}** for **${args.points} pts**. ` +
    `Leaderboard reshuffling now.`;
  await post(channel, msg);
}

export async function announceGhostGraduate(args: {
  username: string;
  serial: string;
}): Promise<void> {
  const channel = victoriesChannel();
  if (!channel) return;
  const msg =
    `🏆 **@${args.username}** just graduated the **Ghost** track. ` +
    `Twenty-two public levels plus the classified graduation gate — cleared. ` +
    `Operative certificate \`${args.serial}\` issued. ` +
    `Profile: https://breachlab.org/u/${args.username}`;
  await post(channel, msg);
}

export async function announcePhantomGraduate(args: {
  username: string;
  serial: string;
}): Promise<void> {
  const channel = victoriesChannel();
  if (!channel) return;
  const msg =
    `🕷 **@${args.username}** just graduated the **Phantom** track. ` +
    `Twenty public levels plus the chained K8s + IMDS graduation lab — cleared. ` +
    `Full post-exploitation tradecraft. Phantom Operative certificate \`${args.serial}\` issued. ` +
    `Profile: https://breachlab.org/u/${args.username}`;
  await post(channel, msg);
}

export async function announceDailyStats(args: {
  newOperatives: number;
  flagsSubmitted: number;
  newGraduatesGhost: number;
  newGraduatesPhantom: number;
  topOperativeOfDay: string | null;
  topPointsOfDay: number;
}): Promise<void> {
  const channel = announcementsChannel();
  if (!channel) return;
  const lines = [
    `📊 **BreachLab · 24h report**`,
    ``,
    `  • New operatives: **${args.newOperatives}**`,
    `  • Flags submitted: **${args.flagsSubmitted}**`,
    `  • Ghost graduations: **${args.newGraduatesGhost}**`,
    `  • Phantom graduations: **${args.newGraduatesPhantom}**`,
  ];
  if (args.topOperativeOfDay) {
    lines.push(
      `  • Top operative: **@${args.topOperativeOfDay}** (${args.topPointsOfDay} pts)`,
    );
  }
  lines.push(``);
  lines.push(`https://breachlab.org/leaderboard`);
  await post(channel, lines.join("\n"));
}
