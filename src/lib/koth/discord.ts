// Fire-and-forget Discord webhook poster for KoTH events.
//
// Reads KOTH_DISCORD_WEBHOOK from env. If unset, all calls become no-ops
// (silent — Discord isn't required, just nice for viral). The webhook
// is created server-side via Discord's "Integrations → Webhooks" UI on
// the #crown-wars channel.
//
// Format examples:
//   ● [14:32:07] alice took the crown via l7-suid
//   ● [14:32:07] alice dethroned bob via l8-suid

type EventArgs = {
  kind: string;
  actorUsername: string | null;
  targetUsername: string | null;
  exploitPath: string | null;
  occurredAt: Date;
};

function formatLine(ev: EventArgs): string | null {
  const ts = ev.occurredAt.toISOString().slice(11, 19);
  const actor = ev.actorUsername ?? "unknown";
  const path = ev.exploitPath ? ` via ${ev.exploitPath}` : "";

  switch (ev.kind) {
    case "crown_taken":
      if (ev.targetUsername) {
        return `● [${ts}] **${actor}** dethroned **${ev.targetUsername}**${path}`;
      }
      return `● [${ts}] **${actor}** took the crown${path}`;
    case "patched":
      return `● [${ts}] **${actor}** patched ${ev.exploitPath ?? "an exploit"}`;
    case "escalated":
      return `● [${ts}] escalation: new path open${path}`;
    case "tutorial":
      return `● [${ts}] **${actor}** cleared the tutorial`;
    default:
      return null;
  }
}

export function postKothEventToDiscord(ev: EventArgs): void {
  const webhook = process.env.KOTH_DISCORD_WEBHOOK;
  if (!webhook) return;

  const line = formatLine(ev);
  if (!line) return;

  // Fire-and-forget. We don't await — the oracle endpoint must return
  // 200 to the daemon fast regardless of Discord's mood.
  fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: line }),
  }).catch(() => {
    // best-effort; Discord outage shouldn't surface anywhere
  });
}
