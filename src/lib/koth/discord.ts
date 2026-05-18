// Fire-and-forget Discord webhook poster for KoTH events.
//
// Reads KOTH_DISCORD_WEBHOOK from env. If unset, all calls become no-ops
// (silent — Discord isn't required, just nice for viral). The webhook
// is created server-side via Discord's "Integrations → Webhooks" UI on
// the #crown-wars channel.
//
// Format: rich embeds (coloured left bar + title + body), not raw text.
// Path slugs (`writable-ld-preload`, `suid-python-wrapper`) are technical and ugly
// in chat — we accept an optional human-readable `pathName` from the
// caller (resolved against the path catalog in api/koth/event/route.ts)
// and fall back to the slug only if the name is missing.

type EventArgs = {
  kind: string;
  actorUsername: string | null;
  actorSlot?: string | null; // "koth0".."koth9" — used for replay-link in embed
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
  newPath: 0x22c55e, // vivid green — new attack path is an opportunity
  victory: 0xffd700, // gold — round won
  patch: 0x6ab04c, // forest green — defensive patch (muted, distinct from newPath)
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
      // Replay deep-link — the sidecar uploads a crown_moment cast a
      // few seconds after the event fires; by the time someone clicks
      // this link, the replays-list page renders it as the top entry.
      // We can't link a specific replay-id yet (cast isn't uploaded at
      // this point), so we link the filtered list scoped to this slot
      // + crown_moment kind — newest first.
      const siteUrl = (process.env.SITE_URL ?? "https://breachlab.org").replace(
        /\/$/,
        "",
      );
      const replayLink =
        ev.actorSlot != null
          ? `${siteUrl}/battles/koth/replays?slot=${encodeURIComponent(
              ev.actorSlot,
            )}&kind=crown_moment`
          : null;
      const description =
        (path ? `via **${path}**${valueLine}` : "") +
        (replayLink ? `\n[▸ watch the kill](${replayLink})` : "");
      if (ev.targetUsername) {
        return {
          color: COLOR.dethrone,
          title: `⚔️ ${actor} dethroned ${ev.targetUsername}`,
          description: description || undefined,
          timestamp: ts,
        };
      }
      return {
        color: COLOR.crown,
        title: `👑 ${actor} took the crown`,
        description: description || undefined,
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

const DOS_PATTERN_LABEL: Record<string, string> = {
  kill_on_login: "Killing other operators on login",
  fork_bomb: "Fork bomb / process table exhaustion",
  mem_bomb: "Memory exhaustion / OOM attack",
  disk_fill: "Disk fill attack",
  sshd_kill: "Killed sshd",
  iptables_drop: "Blocked SSH at the firewall",
  brick_box: "Bricked critical paths (chmod 000)",
  crown_daemon_kill: "Killed the crown daemon",
  escalation_daemon_kill: "Killed the escalation daemon",
};

function dosPatternLabel(pattern: string): string {
  return DOS_PATTERN_LABEL[pattern] ?? `Anti-game pattern: ${pattern}`;
}

// Red-bar embed posted when the in-arena watchdog flags a DoS
// violation. The round is force-closed by the event handler before
// this fires, so the embed wording is past-tense ("forfeit").
export function postKothDosViolationToDiscord(opts: {
  offenderUsername: string | null;
  victimUsername: string | null;
  pattern: string;
  occurredAt: Date;
}): void {
  const offender = opts.offenderUsername ?? "an operator";
  const victim = opts.victimUsername;
  const detail = victim
    ? `**${offender}** attacked **${victim}** — round forfeit.`
    : `**${offender}** triggered an anti-game pattern — round forfeit.`;
  postEmbed({
    color: COLOR.warning,
    title: `⛔ DoS violation — round closed`,
    description: `${dosPatternLabel(opts.pattern)}\n${detail}`,
    timestamp: opts.occurredAt.toISOString(),
    footer: { text: "Crown Wars · fair-play enforcement" },
  });
}

// First-discovery card — fires when a player takes crown via an
// exploit slug not in the catalog. Gold bar so it stands out from
// the regular crown grab embed; one-liner naming the discoverer and
// the bonus.
export function postKothFirstDiscoveryToDiscord(opts: {
  actorUsername: string | null;
  slug: string;
  bonus: number;
  occurredAt: Date;
  siteUrl?: string;
}): void {
  const siteUrl =
    opts.siteUrl ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://breachlab.org";
  const actor = opts.actorUsername ?? "an operator";
  const forgeLink = `${siteUrl}/battles/koth/weapons/submit?slug=${encodeURIComponent(opts.slug)}`;
  postEmbed({
    color: COLOR.victory,
    title: `🌟 First discovery — ${actor} opened a new path`,
    description: `\`${opts.slug}\` is a fresh privesc not in the catalog. **+${opts.bonus} pt** bonus, once per slug.\n\n${actor === "an operator" ? "Player" : `**${actor}**`} — [▸ submit it to the Forge](${forgeLink}) and your handle joins the catalog as permanent credit.`,
    timestamp: opts.occurredAt.toISOString(),
    footer: { text: "Crown Wars · discoverer bonus · Weapons Forge open" },
  });
}

// King's Guard claim announce — fires when a player claims the
// single guard slot for the current round. Quick blue card so it
// reads as a role-claim, not a kill.
export function postKothGuardClaimedToDiscord(opts: {
  guardUsername: string;
  occurredAt?: Date;
  siteUrl?: string;
}): void {
  const siteUrl =
    opts.siteUrl ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://breachlab.org";
  postEmbed({
    color: COLOR.info,
    title: `🛡 ${opts.guardUsername} is the King's Guard`,
    description: `One slot per round. They earn half of the king's active hold-time per minute. Decay seconds don't pay the guard either — incentives aligned with active defense.\n\n[▸ Crown Wars](${siteUrl}/battles/koth)`,
    timestamp: (opts.occurredAt ?? new Date()).toISOString(),
    footer: { text: "Crown Wars · asymmetric role" },
  });
}

// Daily Shared-Seed announce — fires once per UTC day, on the first
// page hit after midnight. Wordle-style FOMO drip: same primitive for
// every operator, leaderboard reset, link to play. Idempotency is
// enforced by a conditional UPDATE on koth_daily_seeds.discord_announced_at;
// this function is only called after the caller has claimed the row.
export function postKothDailyAnnounceToDiscord(opts: {
  dayUtc: string;
  challengeNumber: number;
  pathName: string | null;
  pathSlug: string;
  authorUsername?: string | null;
  siteUrl?: string;
}): void {
  const siteUrl =
    opts.siteUrl ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://breachlab.org";
  const label = opts.pathName?.trim() || opts.pathSlug;
  const credit = opts.authorUsername
    ? `\n\n_Forged by **${opts.authorUsername}**._`
    : "";
  // No hint, no description — pure puzzle drop. Players see the
  // primitive name and the link, nothing else. Spoiler protection
  // is the point.
  postEmbed({
    color: COLOR.victory,
    title: `🗓 Daily #${opts.challengeNumber} — ${label}`,
    description: `Today's primitive is live. One attempt per operator, shared seed worldwide. Crown the path faster than yesterday's leaders.${credit}\n\n[▸ Play today's challenge](${siteUrl}/battles/koth/daily)`,
    timestamp: new Date(opts.dayUtc + "T00:00:00Z").toISOString(),
    footer: { text: `Crown Wars · daily · resets at 00:00 UTC` },
  });
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
