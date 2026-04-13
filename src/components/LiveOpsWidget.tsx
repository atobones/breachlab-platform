import { getLiveStats } from "@/lib/leaderboard/queries";

export async function LiveOpsWidget() {
  const stats = await getLiveStats();
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Live Ops</h2>
      <ul className="text-sm space-y-1">
        <li>
          <span className="text-green">●</span> live
        </li>
        <li>{stats.operatives} operatives</li>
        <li>{stats.completionsToday} completions today</li>
      </ul>
    </section>
  );
}
