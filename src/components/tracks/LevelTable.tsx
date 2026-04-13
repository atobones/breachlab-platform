import type { Level } from "@/lib/db/schema";

export function LevelTable({
  levels,
  solvedLevelIds,
}: {
  levels: Level[];
  solvedLevelIds: Set<string>;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted border-b border-border">
          <th className="text-left py-1">#</th>
          <th className="text-left py-1">Level</th>
          <th className="text-right py-1">Points</th>
          <th className="text-right py-1">Status</th>
        </tr>
      </thead>
      <tbody>
        {levels.map((l) => {
          const solved = solvedLevelIds.has(l.id);
          return (
            <tr key={l.id} className="border-b border-border/50">
              <td className="py-1 text-muted">{l.idx}</td>
              <td className="py-1">{l.title}</td>
              <td className="py-1 text-right">{l.pointsBase}</td>
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
