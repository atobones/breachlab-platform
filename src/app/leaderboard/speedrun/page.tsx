import { getTopSpeedruns } from "@/lib/speedrun/queries";
import { SpeedrunTable } from "@/components/speedrun/SpeedrunTable";

export const dynamic = "force-dynamic";

export default async function SpeedrunPage() {
  const [ghost, phantom] = await Promise.all([
    getTopSpeedruns("ghost", 100),
    getTopSpeedruns("phantom", 100),
  ]);
  return (
    <div className="space-y-8">
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

      <section className="space-y-2">
        <h2 className="text-sm text-amber uppercase tracking-widest">
          Ghost — full track
        </h2>
        <SpeedrunTable rows={ghost} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm text-red uppercase tracking-widest">
          Phantom — full track
        </h2>
        <SpeedrunTable rows={phantom} />
      </section>
    </div>
  );
}
