import type { LeaderRow } from "@/lib/leaderboard/queries";

export function LeaderboardTable({ rows }: { rows: LeaderRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-muted text-sm">
        No operatives on the board yet. Be the first.
      </p>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted border-b border-border">
          <th className="text-left py-1">#</th>
          <th className="text-left py-1">Operative</th>
          <th className="text-right py-1">Solved</th>
          <th className="text-right py-1">Points</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.userId} className="border-b border-border/50">
            <td className="py-1 text-muted">{i + 1}</td>
            <td className="py-1">
              <span className="text-amber">@{r.username}</span>
            </td>
            <td className="py-1 text-right">{r.solved}</td>
            <td className="py-1 text-right">{r.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
