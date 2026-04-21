import { getFirstBloods } from "@/lib/badges/queries";
import { BadgePill } from "@/components/badges/BadgePill";
import { OperativeName } from "@/components/operatives/OperativeName";

export default async function FirstBloodsPage() {
  const rows = await getFirstBloods();
  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">First Bloods</h1>
      <nav className="flex gap-4 text-sm border-b border-border pb-2">
        <a href="/leaderboard" className="text-muted">
          Global
        </a>
        <a href="/leaderboard/speedrun" className="text-muted">
          Speedrun
        </a>
        <span className="text-amber">First Bloods</span>
      </nav>
      {rows.length === 0 ? (
        <p className="text-muted text-sm">
          No first bloods yet. Every level on the board is up for grabs.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted border-b border-border">
              <th className="text-left py-1">Track</th>
              <th className="text-left py-1">Level</th>
              <th className="text-left py-1">Operative</th>
              <th className="text-left py-1">Badge</th>
              <th className="text-right py-1">Taken</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.levelId} className="border-b border-border/50">
                <td className="py-1 text-muted">{r.trackName}</td>
                <td className="py-1">
                  L{r.levelIdx} — {r.levelTitle}
                </td>
                <td className="py-1">
                  @
                  <OperativeName
                    username={r.username}
                    isHallOfFame={r.isHallOfFame}
                    href={`/u/${r.username}`}
                    className={r.isHallOfFame ? "" : "text-amber"}
                  />
                </td>
                <td className="py-1">
                  <BadgePill kind="first_blood" />
                </td>
                <td className="py-1 text-right text-muted">
                  {new Date(r.awardedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
