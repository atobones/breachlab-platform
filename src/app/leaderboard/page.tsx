import { getGlobalTop } from "@/lib/leaderboard/queries";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";

export default async function LeaderboardPage() {
  const rows = await getGlobalTop(100);
  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">Leaderboard</h1>
      <nav className="flex gap-4 text-sm border-b border-border pb-2">
        <span className="text-amber">Global</span>
        <a href="/leaderboard/speedrun" className="text-muted">
          Speedrun
        </a>
        <a href="/leaderboard/first-bloods" className="text-muted">
          First Bloods
        </a>
      </nav>
      <LeaderboardTable rows={rows} />
    </div>
  );
}
