import { getTopBurners } from "@/lib/leaderboard/queries";
import { OperativeName } from "@/components/operatives/OperativeName";

export async function TopBurners() {
  const rows = await getTopBurners(5);
  const peak = rows[0]?.count ?? 1;
  return (
    <div className="border border-amber/20 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-amber">[ TOP BURNERS · 1h ]</span>
        <span className="text-muted">live</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-muted text-[11px]">no activity in last hour</div>
      ) : (
        <ol className="flex flex-col gap-1 text-[11px]">
          {rows.map((r, i) => {
            const width = Math.max(8, Math.round((r.count / peak) * 100));
            return (
              <li key={r.username} className="flex items-center gap-2">
                <span className="text-muted tabular-nums w-5 shrink-0">
                  #{String(i + 1).padStart(2, "0")}
                </span>
                <span className="w-28 shrink-0 truncate">
                  <OperativeName
                    username={r.username}
                    isHallOfFame={r.isHallOfFame}
                    href={`/u/${r.username}`}
                  />
                </span>
                <div className="flex-1 h-[6px] bg-amber/5 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-amber/70"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="tabular-nums w-8 text-right text-amber">
                  +{r.count}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
