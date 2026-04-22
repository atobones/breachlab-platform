import type { SpeedrunRow } from "@/lib/speedrun/queries";
import { OperativeName } from "@/components/operatives/OperativeName";
import { formatHhMmSs } from "@/lib/speedrun/format";

// Only surface a status pill when it carries information. Non-suspicious
// runs sit in review_status='pending' forever because admin review is
// suspicious-only — showing "pending" on every legitimate run was just
// noise. Approved and suspicious are the only states a viewer cares about.
function statusFor(row: SpeedrunRow): "approved" | "suspicious" | null {
  if (row.isSuspicious && row.reviewStatus === "pending") return "suspicious";
  if (row.reviewStatus === "approved") return "approved";
  return null;
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
                  {formatHhMmSs(r.totalSeconds)}
                </td>
                <td className="py-1 text-right text-muted">
                  {status === "suspicious" ? (
                    <span className="text-red">[flagged]</span>
                  ) : status === "approved" ? (
                    <span className="text-green">[approved]</span>
                  ) : null}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}
