import type { LeaderRow } from "@/lib/leaderboard/queries";
import { EmptyState } from "@/components/EmptyState";
import { OperativeName } from "@/components/operatives/OperativeName";

const RANK_TONE = [
  "text-amber",
  "text-amber/85",
  "text-amber/65",
];

export function LeaderboardTable({ rows }: { rows: LeaderRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        message="no operatives on the board yet"
        hint="be the first"
      />
    );
  }
  return (
    <table className="w-full text-sm tabular-nums">
      <thead>
        <tr className="text-muted border-b border-border">
          <th className="text-left py-1">#</th>
          <th className="text-left py-1">Operative</th>
          <th className="text-right py-1">Solved</th>
          <th className="text-right py-1">Points</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const rankTone = RANK_TONE[i] ?? "text-muted";
          return (
            <tr key={r.userId} className="border-b border-border/50">
              <td className={`py-1 ${i < 3 ? rankTone : "text-muted"}`}>
                {i + 1}
              </td>
              <td className="py-1">
                <OperativeName
                  username={r.username}
                  isHallOfFame={r.isHallOfFame}
                  href={`/u/${r.username}`}
                  className={r.isHallOfFame ? "" : rankTone}
                />
              </td>
              <td className="py-1 text-right">{r.solved}</td>
              <td className="py-1 text-right">{r.points}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
