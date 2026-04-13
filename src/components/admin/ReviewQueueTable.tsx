import type { SuspiciousRunRow } from "@/lib/speedrun/queries";
import { approveRun, rejectRun } from "@/app/admin/review/actions";

function formatTime(totalSeconds: number | null): string {
  if (totalSeconds === null) return "—";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ReviewQueueTable({ runs }: { runs: SuspiciousRunRow[] }) {
  return (
    <table className="w-full text-sm font-mono">
      <thead>
        <tr className="text-left text-muted text-xs">
          <th className="py-1">Operative</th>
          <th className="py-1">Track</th>
          <th className="py-1">Time</th>
          <th className="py-1">Started</th>
          <th className="py-1">Actions</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <tr key={run.id} className="border-t border-amber/10">
            <td className="py-2 text-amber">{run.username}</td>
            <td className="py-2">{run.trackName}</td>
            <td className="py-2">{formatTime(run.totalSeconds)}</td>
            <td className="py-2 text-xs text-muted">
              {run.startedAt.toISOString().slice(0, 19).replace("T", " ")}
            </td>
            <td className="py-2 flex gap-2">
              <form action={approveRun.bind(null, run.id)}>
                <button
                  type="submit"
                  className="text-xs px-2 py-1 border border-amber/40 text-amber hover:bg-amber/10"
                >
                  Approve
                </button>
              </form>
              <form action={rejectRun.bind(null, run.id)}>
                <button
                  type="submit"
                  className="text-xs px-2 py-1 border border-red/40 text-red hover:bg-red/10"
                >
                  Reject
                </button>
              </form>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
