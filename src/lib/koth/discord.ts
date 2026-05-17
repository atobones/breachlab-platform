// Fire-and-forget Discord webhook poster for KoTH events.
//
// Reads KOTH_DISCORD_WEBHOOK from env. If unset, all calls become no-ops
// (silent — Discord isn't required, just nice for viral). The webhook
// is created server-side via Discord's "Integrations → Webhooks" UI on
// the #crown-wars channel.
//
// Format: rich embeds (coloured left bar + title + body), not raw text.
// Path slugs (`writable-ld-preload`, `l7-suid`) are technical and ugly
// in chat — we accept an optional human-readable `pathName` from the
// caller (resolved against the path catalog in api/koth/event/route.ts)
// and fall back to the slug only if the name is missing.

type EventArgs = {
  kind: string;
  actorUsername: string | null;
  targetUsername: string | null;
  exploitPath: string | null; // slug, kept for fallback
  pathName?: string | null; // human-readable, e.g. "Writable PYTHONPATH"
  occurredAt: Date;
  valueSnapshot?: number | null;
};

type Embed = {
  color: number;
  title?: string;
  description?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
  footer?: { text: string };
};

const COLOR = {
  crown: 0xfcb814, // amber — crown grab
  dethrone: 0xff7a00, // orange — displacement
  warning: 0xff4040, // red — escalation warning
  newPath: 0xffa500, // tangerine — new path opened
  victory: 0xffd700, // gold — round won
  patch: 0x6ab04c, // green — defensive patch
  info: 0x4ab0ff, // sky — neutral
} as const;

function pathLabel(name: string | null | undefined, slug: string | null): string | null {
  if (name && name.trim()) return name;
  if (slug && slug.trim()) return slug;
  return null;
}

function embedForEvent(ev: EventArgs): Embed | null {
  const ts = ev.occurredAt.toISOString();
  const actor = ev.actorUsername ?? "unknown";
  const path = pathLabel(ev.pathName, ev.exploitPath);
  const pts = ev.valueSnapshot;

  switch (ev.kind) {
    case "crown_taken": {
      const valueLine = pts != null ? ` · **+${pts} pt**` : "";
      if (ev.targetUsername) {
        return {
          color: COLOR.dethrone,
          title: `⚔️ ${actor} dethroned ${ev.targetUsername}`,
          description: path ? `via **${path}**${valueLine}` : undefined,
          timestamp: ts,
        };
      }
      return {
        color: COLOR.crown,
        title: `👑 ${actor} took the crown`,
        description: path ? `via **${path}**${valueLine}` : undefined,
        timestamp: ts,
      };
    }
    case "patched":
      return {
        color: COLOR.patch,
        title: `🛡️ ${actor} patched the box`,
        description: path ? `Closed **${path}** · **+3 pt**` : undefined,
        timestamp: ts,
      };
    case "path_patched_attributed":
      return {
        color: COLOR.patch,
        title: `🛡️ ${actor} sealed the path`,
        description: path
          ? `Path-attributed patch on **${path}** · **+5 pt**`
          : undefined,
        timestamp: ts,
      };
    case "escalation_pending":
      return {
        color: COLOR.warning,
        title: `⚠️ Escalation incoming`,
        description: path
          ? `**${path}** opens in ~60 seconds`
          : `A new attack path opens in ~60 seconds`,
        timestamp: ts,
      };
    case "path_activated": {
      const baseLine = pts != null ? ` · base **${pts} pt**` : "";
      return {
        color: COLOR.newPath,
        title: `🆕 New attack path open`,
        description: path ? `**${path}**${baseLine}` : undefined,
        timestamp: ts,
      };
    }
    case "tutorial":
      return {
        color: COLOR.info,
        title: `✓ ${actor} cleared the tutorial`,
        timestamp: ts,
      };
    default:
      return null;
  }
}

function postEmbed(embed: Embed): void {
  const webhook = process.env.KOTH_DISCORD_WEBHOOK;
  if (!webhook) return;
  fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  }).catch(() => {
    // best-effort
  });
}

export function postKothEventToDiscord(ev: EventArgs): void {
  const embed = embedForEvent(ev);
  if (!embed) return;
  postEmbed(embed);
}

// Round summary card. Single embed, gold bar, winner stats in three
// inline fields so they line up neatly on desktop and mobile.
export function postKothRoundCloseToDiscord(opts: {
  winnerUsername: string;
  points: number;
  dethrones: number;
  crownDurationSeconds: number;
  closedAt: Date;
}): void {
  const holdM = Math.floor(opts.crownDurationSeconds / 60);
  const holdS = opts.crownDurationSeconds % 60;
  const hold = holdM > 0 ? `${holdM}m ${holdS}s` : `${holdS}s`;
  postEmbed({
    color: COLOR.victory,
    title: `🏆 ${opts.winnerUsername} takes the round`,
    fields: [
      { name: "Score", value: `${opts.points} pt`, inline: true },
      { name: "Dethrones", value: `${opts.dethrones}`, inline: true },
      { name: "Throne time", value: hold, inline: true },
    ],
    timestamp: opts.closedAt.toISOString(),
    footer: { text: "Crown Wars · round closed" },
  });
}
