import { getConquestWall } from "@/lib/leaderboard/queries";
import { OperativeName } from "@/components/operatives/OperativeName";

// Top-N operator × per-track progress matrix. Each cell is a thin progress bar
// showing solved/total levels in that track for that operator. Always dense,
// always readable at a glance — "who's where on what".

export async function ConquestWall() {
  const { tracks, rows } = await getConquestWall(15);

  // Render every track column we know about (so the table width is stable
  // regardless of which operators have touched which tracks).
  return (
    <div className="border border-amber/20 flex flex-col min-w-0 min-h-0">
      <div className="flex items-center justify-between text-[11px] px-3 py-2 border-b border-amber/10">
        <span className="text-amber">[ CONQUEST WALL ]</span>
        <span className="text-muted">
          top {rows.length} · {tracks.length} tracks · solved / total
        </span>
      </div>

      <div className="overflow-auto flex-1 min-h-0">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="text-muted">
              <th className="text-left font-normal px-3 py-1.5 w-10">#</th>
              <th className="text-left font-normal px-2 py-1.5 w-40">
                operative
              </th>
              <th className="text-right font-normal px-2 py-1.5 w-16">pts</th>
              {tracks.map((t) => (
                <th
                  key={t.slug}
                  className="text-left font-normal px-2 py-1.5"
                  title={`${t.name} — ${t.status}`}
                >
                  <span
                    className={
                      t.status === "live" ? "text-amber/80" : "text-muted/60"
                    }
                  >
                    {t.slug.slice(0, 7)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3 + tracks.length}
                  className="text-muted text-center py-6"
                >
                  awaiting first submission
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.username}
                  className="border-t border-amber/5 hover:bg-amber/[0.025]"
                >
                  <td className="text-muted tabular-nums px-3 py-1.5">
                    #{String(idx + 1).padStart(2, "0")}
                  </td>
                  <td className="px-2 py-1.5">
                    <OperativeName
                      username={row.username}
                      isHallOfFame={row.isHallOfFame}
                      href={`/u/${row.username}`}
                    />
                  </td>
                  <td className="text-amber tabular-nums text-right px-2 py-1.5">
                    {row.totalPoints}
                  </td>
                  {tracks.map((t) => {
                    const solved = row.perTrack[t.slug] ?? 0;
                    const isComplete = t.total > 0 && solved === t.total;
                    const inProgress = solved > 0 && !isComplete;
                    const glyph = isComplete ? "✓" : inProgress ? "◐" : "·";
                    const tone = isComplete
                      ? "text-green"
                      : inProgress
                        ? "text-amber"
                        : "text-muted/30";
                    return (
                      <td
                        key={t.slug}
                        className={`px-2 py-1.5 tabular-nums ${tone}`}
                      >
                        <span className="inline-flex items-baseline gap-1.5">
                          <span aria-hidden>{glyph}</span>
                          <span>
                            {solved}
                            <span className="text-muted/40">/{t.total}</span>
                          </span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
