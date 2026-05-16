import type { LiveSessionRow } from "@/lib/admin/queries";

const SOURCE_LABELS: Record<string, string> = {
  ghost: "Ghost",
  phantom: "Phantom (mono)",
  "phantom-deep": "Phantom Deep",
  specter: "Specter",
};

const SOURCE_ORDER = ["ghost", "phantom", "specter", "phantom-deep"];

function formatDuration(from: Date, now: number): string {
  const sec = Math.max(0, Math.floor((now - from.getTime()) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  return `${hr}h${min % 60}m`;
}

export function LiveSessionsRoster({ rows }: { rows: LiveSessionRow[] }) {
  const now = Date.now();
  const grouped = new Map<string, LiveSessionRow[]>();
  for (const r of rows) {
    const bucket = grouped.get(r.source) ?? [];
    bucket.push(r);
    grouped.set(r.source, bucket);
  }
  const orderedSources = [
    ...SOURCE_ORDER.filter((s) => grouped.has(s)),
    ...Array.from(grouped.keys()).filter((s) => !SOURCE_ORDER.includes(s)),
  ];

  if (rows.length === 0) {
    return (
      <div className="border border-amber/20 p-4 text-xs font-mono text-muted">
        No live SSH sessions instrumented yet. Counts above are still
        authoritative for total active operatives.
      </div>
    );
  }

  return (
    <div className="border border-amber/20 divide-y divide-amber/10">
      {orderedSources.map((source) => {
        const sessions = grouped.get(source) ?? [];
        return (
          <div key={source} className="p-3 font-mono text-xs">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-amber uppercase tracking-wider">
                {SOURCE_LABELS[source] ?? source}
              </span>
              <span className="text-muted">
                {sessions.length} session{sessions.length === 1 ? "" : "s"}
              </span>
            </div>
            <table className="w-full tabular-nums">
              <thead>
                <tr className="text-left text-[10px] text-muted uppercase tracking-wider">
                  <th className="py-1 pr-3">Operative</th>
                  <th className="py-1 pr-3">Level</th>
                  <th className="py-1 pr-3 text-right">Connected</th>
                  <th className="py-1 text-right">Last beat</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, idx) => (
                  <tr
                    key={`${s.username}-${s.containerId ?? idx}`}
                    className="border-t border-amber/5"
                  >
                    <td className="py-1 pr-3 text-amber">@{s.username}</td>
                    <td className="py-1 pr-3 text-text/80">{s.level ?? "—"}</td>
                    <td className="py-1 pr-3 text-right text-text/80">
                      {formatDuration(s.startedAt, now)}
                    </td>
                    <td className="py-1 text-right text-muted">
                      {formatDuration(s.lastHeartbeatAt, now)} ago
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
