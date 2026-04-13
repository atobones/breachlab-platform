import { getTopSpeedruns } from "@/lib/speedrun/queries";
import { SpeedrunTable } from "@/components/speedrun/SpeedrunTable";

export default async function SpeedrunPage() {
  const rows = await getTopSpeedruns("ghost", 100);
  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">Speedrun leaderboard</h1>
      <nav className="flex gap-4 text-sm border-b border-border pb-2">
        <a href="/leaderboard" className="text-muted">
          Global
        </a>
        <span className="text-amber">Speedrun</span>
        <a href="/leaderboard/first-bloods" className="text-muted">
          First Bloods
        </a>
      </nav>
      <SpeedrunTable rows={rows} />
    </div>
  );
}
