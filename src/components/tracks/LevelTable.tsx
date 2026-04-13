import type { Level } from "@/lib/db/schema";

export type FirstBloodInfo = { username: string; awardedAt: Date };

export function LevelTable({
  levels,
  solvedLevelIds,
  firstBloodByLevelId,
}: {
  levels: Level[];
  solvedLevelIds: Set<string>;
  firstBloodByLevelId: Map<string, FirstBloodInfo>;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted border-b border-border">
          <th className="text-left py-1">#</th>
          <th className="text-left py-1">Level</th>
          <th className="text-right py-1">Points</th>
          <th className="text-left py-1 pl-4">First Blood</th>
          <th className="text-right py-1">Status</th>
        </tr>
      </thead>
      <tbody>
        {levels.map((l) => {
          const solved = solvedLevelIds.has(l.id);
          const fb = firstBloodByLevelId.get(l.id);
          return (
            <tr key={l.id} className="border-b border-border/50">
              <td className="py-1 text-muted">{l.idx}</td>
              <td className="py-1">{l.title}</td>
              <td className="py-1 text-right">{l.pointsBase}</td>
              <td className="py-1 pl-4">
                {fb ? (
                  <span className="text-amber">@{fb.username}</span>
                ) : (
                  <span className="text-red text-xs">FIRST BLOOD AVAILABLE</span>
                )}
              </td>
              <td
                className={`py-1 text-right ${
                  solved ? "text-green" : "text-muted"
                }`}
              >
                {solved ? "solved" : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
