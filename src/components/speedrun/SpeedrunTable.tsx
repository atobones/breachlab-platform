import type { SpeedrunRow } from "@/lib/speedrun/queries";
import { OperativeName } from "@/components/operatives/OperativeName";

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function statusFor(row: SpeedrunRow): "approved" | "pending" | "suspicious" {
  if (row.isSuspicious && row.reviewStatus === "pending") return "suspicious";
  if (row.reviewStatus === "approved") return "approved";
  return "pending";
}

export function SpeedrunTable({ rows }: { rows: SpeedrunRow[] }) {
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-muted border-b border-border">
          <th className="text-left py-1">#</th>
          <th className="text-left py-1">Operative</th>
          <th className="text-right py-1">Time</th>
          <th className="text-right py-1">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr className="border-b border-border/50">
            <td colSpan={4} className="py-2 text-muted text-center">
              No speedruns yet
            </td>
          </tr>
        ) : (
          rows.map((r, i) => {
            const status = statusFor(r);
            return (
              <tr
                key={`${r.username}-${r.finishedAt.toISOString()}`}
                className="border-b border-border/50"
              >
                <td className="py-1 text-muted">{i + 1}</td>
                <td className="py-1">
                  @
                  <OperativeName
                    username={r.username}
                    isHallOfFame={r.isHallOfFame}
                    href={`/u/${r.username}`}
                    className={r.isHallOfFame ? "" : "text-amber"}
                  />
                </td>
                <td className="py-1 text-right">
                  {formatMmSs(r.totalSeconds)}
                </td>
                <td className="py-1 text-right text-muted">{status}</td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
