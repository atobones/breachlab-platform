import Link from "next/link";
import { getGlobalTop, getLiveStats } from "@/lib/leaderboard/queries";
import { RecentHallOfFame } from "./RecentHallOfFame";
import { OperativeName } from "./operatives/OperativeName";

export async function OpsCenter() {
  const [top, stats] = await Promise.all([
    getGlobalTop(5),
    getLiveStats(),
  ]);

  const topPoints = top[0]?.points ?? 1;

  return (
    <section className="ops-center" aria-label="Operations Center">
      <div className="ops-header">
        <span className="ops-tag">[ OPS ]</span>
        <span className="ops-title">live operations center</span>
        <span className="ops-pulse" aria-hidden>●</span>
      </div>

      <div className="ops-stats">
        <Stat label="operatives online" value={stats.operatives} accent />
        <Stat label="completions / 24h" value={stats.completionsToday} />
        <Stat label="ranked" value={top.length === 0 ? "—" : `top ${top.length}`} />
        <Stat label="uplink" value="●  ok" mono />
      </div>

      <div className="ops-grid">
        <div className="ops-pane ops-pane-left">
          <div className="ops-pane-header">
            <span>▸ hall of fame</span>
            <Link href="/hall-of-fame" className="ops-pane-meta hover:underline">
              full wall →
            </Link>
          </div>
          <RecentHallOfFame />
        </div>

        <div className="ops-pane ops-pane-right">
          <div className="ops-pane-header">
            <span>▸ top operatives</span>
            <Link href="/leaderboard" className="ops-pane-meta hover:underline">
              full board →
            </Link>
          </div>
          {top.length === 0 ? (
            <div className="ops-empty">awaiting first submission</div>
          ) : (
            <ol className="ops-htop">
              {top.map((row, i) => {
                const widthPct = Math.max(8, Math.round((row.points / topPoints) * 100));
                return (
                  <li key={row.userId} className="ops-htop-row">
                    <span className="ops-htop-rank">#{String(i + 1).padStart(2, "0")}</span>
                    <span className="ops-htop-name">
                      <OperativeName
                        username={row.username}
                        isHallOfFame={row.isHallOfFame}
                        href={`/u/${row.username}`}
                      />
                    </span>
                    <div className="ops-htop-bar" aria-hidden>
                      <div className="ops-htop-fill" style={{ width: `${widthPct}%` }} />
                    </div>
                    <span className="ops-htop-points tabular-nums">{row.points}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="ops-stat">
      <div className={`ops-stat-value ${accent ? "ops-stat-accent" : ""} ${mono ? "ops-stat-mono" : ""}`}>
        {value}
      </div>
      <div className="ops-stat-label">{label}</div>
    </div>
  );
}
