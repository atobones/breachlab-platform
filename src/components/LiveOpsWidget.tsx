import { getLiveStats } from "@/lib/leaderboard/queries";

export async function LiveOpsWidget() {
  const stats = await getLiveStats();
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Live Ops</h2>
      <ul className="text-sm space-y-1 tabular-nums">
        <li className="flex items-center gap-2">
          <span className="text-green pulse-dot" aria-hidden>
            ●
          </span>
          <span>live</span>
        </li>
        <li>
          <span className="text-amber">{stats.operatives}</span>{" "}
          <span className="text-muted">operatives</span>
        </li>
        <li>
          <span className="text-amber">{stats.completionsToday}</span>{" "}
          <span className="text-muted">completions today</span>
        </li>
      </ul>
    </section>
  );
}
