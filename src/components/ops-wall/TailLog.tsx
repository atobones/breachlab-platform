import { getRecentSubmits } from "@/lib/leaderboard/queries";

function pad(n: number, w: number): string {
  return String(n).padStart(w, "0");
}

function fmtTs(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1, 2)}-${pad(
    d.getUTCDate(),
    2,
  )}T${pad(d.getUTCHours(), 2)}:${pad(d.getUTCMinutes(), 2)}:${pad(
    d.getUTCSeconds(),
    2,
  )}Z`;
}

export async function TailLog() {
  const rows = await getRecentSubmits(14);
  return (
    <div className="border border-amber/20 p-3 flex flex-col gap-1.5 min-h-0">
      <div className="text-[11px] text-amber/80 shrink-0">
        <span className="text-green">admin@bl-prod</span>
        <span className="text-muted"> ~$ </span>
        <span>tail -f /var/log/breachlab/submits.log</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-muted text-[11px] font-mono">
          [empty log — awaiting first submission]
        </div>
      ) : (
        <div className="text-[11px] leading-relaxed font-mono flex flex-col overflow-y-auto min-h-0">
          {rows.map((r, i) => (
            <div
              key={i}
              className="text-text/80 whitespace-pre overflow-hidden"
            >
              <span className="text-muted">{fmtTs(r.submittedAt)} </span>
              <span className="text-green">OK </span>
              <span>
                user={r.username.padEnd(14, " ")} track=
                {r.trackSlug.padEnd(8, " ")} level=
                {String(r.levelIdx).padEnd(3, " ")}
              </span>
              <span className="text-amber">+{r.pointsAwarded}pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
