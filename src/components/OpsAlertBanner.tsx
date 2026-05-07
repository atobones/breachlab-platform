/**
 * OpsAlertBanner — site-wide ops/incident notice.
 *
 * Server component. Reads OPS_ALERT_MESSAGE from env at request time so
 * we can flip on/off without redeploy (Vercel env update + rolling boot).
 * Empty env = no banner rendered. Multi-line: split on \n.
 *
 * Created 2026-05-07 to surface the unannounced SSH host-key rotation
 * to non-Discord players (Kergash incident). General-purpose: use it for
 * any future ops notice (downtime, key rotation announcements, etc.).
 */
export function OpsAlertBanner() {
  const message = process.env.OPS_ALERT_MESSAGE?.trim();
  if (!message) return null;

  const title = process.env.OPS_ALERT_TITLE?.trim() || "OPS NOTICE";
  const lines = message.split(/\\n|\n/).filter((l) => l.length > 0);

  return (
    <div className="border-b border-red-500/50 bg-red-500/10 px-4 py-2 text-[12px] font-mono text-red-300">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-bold uppercase tracking-wider text-red-400">
          [ {title} ]
        </span>
        <div className="flex-1 normal-case tracking-normal text-text/85 space-y-0.5">
          {lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
