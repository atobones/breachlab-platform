import { getTopContributors } from "@/lib/hall-of-fame/queries";
import { OperativeName } from "@/components/operatives/OperativeName";

// Renders the top 5 hall-of-fame contributors sorted by security_score.
// Matches the ops-htop layout on the right (rank · name · bar · score)
// so both panes of the OpsCenter read as one dashboard.
export async function RecentHallOfFame() {
  const top = await getTopContributors(5);

  if (top.length === 0) {
    return (
      <div className="ops-stream ops-stream-empty">
        <span className="text-muted">no security contributors yet</span>
      </div>
    );
  }

  const maxScore = top[0].score || 1;

  return (
    <ol className="ops-htop">
      {top.map((c, i) => {
        const widthPct = Math.max(8, Math.round((c.score / maxScore) * 100));
        return (
          <li key={c.userId} className="ops-htop-row">
            <span className="ops-htop-rank">
              #{String(i + 1).padStart(2, "0")}
            </span>
            <span className="ops-htop-name">
              <OperativeName
                username={c.username}
                isHallOfFame={true}
                href={`/u/${c.username}`}
              />
            </span>
            <div
              className="ops-htop-bar"
              aria-hidden
              title={`${c.reports} report${c.reports === 1 ? "" : "s"}`}
            >
              <div
                className="ops-htop-fill hof-bar"
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span className="ops-htop-points tabular-nums">{c.score}</span>
          </li>
        );
      })}
    </ol>
  );
}
