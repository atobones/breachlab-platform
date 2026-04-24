import type { Level } from "@/lib/db/schema";
import { OperativeName } from "@/components/operatives/OperativeName";

export type FirstBloodInfo = {
  username: string;
  isHallOfFame: boolean;
  awardedAt: Date;
};

export function LevelTable({
  levels,
  solvedLevelIds,
  unlockedLevelIds,
  authed,
  firstBloodByLevelId,
  solveCountByLevelId,
}: {
  levels: Level[];
  solvedLevelIds: Set<string>;
  unlockedLevelIds: Set<string>;
  authed: boolean;
  firstBloodByLevelId: Map<string, FirstBloodInfo>;
  solveCountByLevelId?: Map<string, number>;
}) {
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-muted border-b border-border">
          <th className="text-left py-1">#</th>
          <th className="text-left py-1">Level</th>
          <th className="text-right py-1">Points</th>
          <th className="text-right py-1">Operatives</th>
          <th className="text-left py-1 pl-4">First Blood</th>
          <th className="text-right py-1">Status</th>
        </tr>
      </thead>
      <tbody>
        {levels.map((l) => {
          const solved = solvedLevelIds.has(l.id);
          const unlocked = unlockedLevelIds.has(l.id);
          const fb = firstBloodByLevelId.get(l.id);
          const solveCount = solveCountByLevelId?.get(l.id) ?? 0;
          return (
            <tr key={l.id} className="border-b border-border/50">
              <td className="py-1 text-muted">{l.idx}</td>
              <td className="py-1">{l.title}</td>
              <td className="py-1 text-right">{l.pointsBase}</td>
              <td className="py-1 text-right text-muted">
                {solveCount > 0 ? solveCount : "—"}
              </td>
              <td className="py-1 pl-4">
                {fb ? (
                  <>
                    @
                    <OperativeName
                      username={fb.username}
                      isHallOfFame={fb.isHallOfFame}
                      href={`/u/${fb.username}`}
                      className={fb.isHallOfFame ? "" : "text-amber"}
                    />
                  </>
                ) : (
                  <span className="text-red text-xs">FIRST BLOOD AVAILABLE</span>
                )}
              </td>
              <td className="py-1 text-right whitespace-nowrap">
                {!authed ? (
                  <span className="text-muted">—</span>
                ) : solved ? (
                  <span className="text-green">solved</span>
                ) : unlocked ? (
                  <span className="text-amber">available</span>
                ) : (
                  <span className="text-muted">locked</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
