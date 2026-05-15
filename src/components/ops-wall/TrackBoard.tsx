import Link from "next/link";
import { getTrackBoard } from "@/lib/leaderboard/queries";

function relTime(d: Date | null): string {
  if (!d) return "—";
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

const STATUS_TONE: Record<string, string> = {
  live: "text-green",
  early_access: "text-amber",
  planned: "text-muted/60",
};

export async function TrackBoard() {
  const rows = await getTrackBoard();
  return (
    <div className="border border-amber/20 flex flex-col min-h-0">
      <div className="flex items-center justify-between text-[11px] px-3 py-2 border-b border-amber/10 shrink-0">
        <span className="text-amber">[ TRACK BOARD ]</span>
        <span className="text-muted">all 13 tracks · 24h window</span>
      </div>
      <div className="overflow-y-auto flex-1 min-h-0">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="text-muted">
              <th className="text-left font-normal px-3 py-1.5">track</th>
              <th className="text-left font-normal px-2 py-1.5">status</th>
              <th className="text-right font-normal px-2 py-1.5">levels</th>
              <th className="text-right font-normal px-2 py-1.5">solves 24h</th>
              <th className="text-right font-normal px-2 py-1.5">ops 24h</th>
              <th className="text-right font-normal px-3 py-1.5">last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tone = STATUS_TONE[r.status] ?? "text-muted";
              const hasActivity = r.solves24h > 0;
              return (
                <tr
                  key={r.slug}
                  className="border-t border-amber/5 hover:bg-amber/[0.025]"
                >
                  <td className="px-3 py-1.5">
                    <Link
                      href={`/tracks/${r.slug}`}
                      className="text-amber hover:underline no-underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className={`px-2 py-1.5 uppercase text-[10px] ${tone}`}>
                    {r.status.replace("_", " ")}
                  </td>
                  <td className="px-2 py-1.5 text-right text-muted tabular-nums">
                    {r.totalLevels}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right tabular-nums ${
                      hasActivity ? "text-amber" : "text-muted/40"
                    }`}
                  >
                    {r.solves24h}
                  </td>
                  <td
                    className={`px-2 py-1.5 text-right tabular-nums ${
                      hasActivity ? "text-text" : "text-muted/40"
                    }`}
                  >
                    {r.uniqueSolvers}
                  </td>
                  <td className="px-3 py-1.5 text-right text-muted tabular-nums">
                    {relTime(r.lastSolveAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
