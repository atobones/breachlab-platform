/**
 * OpsAlertBanner — site-wide ops/incident notice.
 *
 * Server component. Reads three env vars at request time so we can flip
 * on/off and re-tone without redeploy:
 *
 *   OPS_ALERT_TITLE     — header text rendered as `[ TITLE ]`
 *   OPS_ALERT_MESSAGE   — body, multi-line via literal `\n`
 *   OPS_ALERT_SEVERITY  — `info` | `warn` | `danger` (default: `danger`)
 *
 * Lines that begin with a known command (`ssh`, `curl`, `bash`, `sudo`,
 * `nc`, `wget`, `telnet`, `ssh-keygen`) are auto-rendered as a copyable
 * monospace code block. All other lines render as paragraphs.
 *
 * Empty `OPS_ALERT_MESSAGE` = no banner.
 *
 * Created 2026-05-07 for the unannounced SSH host-key rotation surface
 * (Kergash incident). Refactored 2026-05-09 with vertical layout +
 * severity tones + command auto-detection (the original flex-row layout
 * read awkwardly when the body had multiple lines).
 */

const SEVERITY_STYLES = {
  info: {
    container: "border-amber/40 bg-amber/[0.04]",
    title: "text-amber",
    rule: "border-amber/30",
  },
  warn: {
    container: "border-yellow-500/50 bg-yellow-500/[0.06]",
    title: "text-yellow-300",
    rule: "border-yellow-500/40",
  },
  danger: {
    container: "border-red-500/50 bg-red-500/[0.08]",
    title: "text-red-400",
    rule: "border-red-500/40",
  },
} as const;

type Severity = keyof typeof SEVERITY_STYLES;

const COMMAND_LINE_RE =
  /^(ssh|scp|curl|wget|bash|sh|sudo|nc|telnet|ssh-keygen|ssh-copy-id|gpg|openssl)\s/;

function parseSeverity(raw: string | undefined): Severity {
  const v = raw?.trim().toLowerCase();
  if (v === "info") return "info";
  if (v === "warn" || v === "warning") return "warn";
  return "danger";
}

export function OpsAlertBanner() {
  const message = process.env.OPS_ALERT_MESSAGE?.trim();
  if (!message) return null;

  const title = process.env.OPS_ALERT_TITLE?.trim() || "OPS NOTICE";
  const severity = parseSeverity(process.env.OPS_ALERT_SEVERITY);
  const style = SEVERITY_STYLES[severity];

  const lines = message.split(/\\n|\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  return (
    <div
      className={`border-b ${style.container} px-4 py-3`}
      role="status"
      aria-label="Ops notice"
    >
      <div className="mx-auto max-w-5xl space-y-2">
        <div
          className={`text-[11px] font-mono font-bold uppercase tracking-[0.18em] ${style.title}`}
        >
          [ {title} ]
        </div>
        <div className={`border-t ${style.rule} pt-2 space-y-1.5 text-[13px] leading-relaxed text-text/90`}>
          {lines.map((line, i) =>
            COMMAND_LINE_RE.test(line) ? (
              <pre
                key={i}
                className={`text-[12px] ${style.title} bg-black/40 border ${style.rule} px-3 py-1.5 overflow-x-auto select-all whitespace-pre`}
              >
                {line}
              </pre>
            ) : (
              <p key={i}>{line}</p>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
