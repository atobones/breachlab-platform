import { StatCard, StatGrid } from "@/components/admin/StatCard";
import {
  getOverviewStats,
  getTrackBreakdown,
  getDailyTrend,
  getLiveSessions,
} from "@/lib/admin/queries";
import { TrendBars } from "@/components/admin/TrendBars";
import { LiveSessionsRoster } from "@/components/admin/LiveSessionsRoster";

export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export default async function AdminOverviewPage() {
  const [stats, tracks, trend, liveSessions] = await Promise.all([
    getOverviewStats(),
    getTrackBreakdown(),
    getDailyTrend(30),
    getLiveSessions(),
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-muted">
          ▸ Live right now
        </h2>
        <StatGrid>
          <StatCard
            label="On the platform"
            value={fmt(stats.active.webNow)}
            hint="last seen < 1 min"
            tone="green"
          />
          <StatCard
            label="In the field (SSH)"
            value={fmt(stats.active.sshNow)}
            hint="Ghost + Phantom + Specter + ephemerals"
            tone="green"
          />
          <StatCard
            label="Total operatives"
            value={fmt(stats.active.webNow + stats.active.sshNow)}
            hint="web + SSH (may double-count)"
          />
          <StatCard
            label="Completions today"
            value={fmt(stats.submissions.today)}
          />
        </StatGrid>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-muted">
          ▸ Operatives online right now
        </h2>
        <LiveSessionsRoster rows={liveSessions} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-muted">
          ▸ Users
        </h2>
        <StatGrid>
          <StatCard
            label="Total"
            value={fmt(stats.users.total)}
            tone="amber"
            delta={{ value: stats.users.newToday, label: "today" }}
          />
          <StatCard label="New today" value={fmt(stats.users.newToday)} />
          <StatCard label="New 7d" value={fmt(stats.users.new7d)} />
          <StatCard label="New 30d" value={fmt(stats.users.new30d)} />
        </StatGrid>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-muted">
          ▸ Active users (DAU / WAU / MAU)
        </h2>
        <StatGrid>
          <StatCard label="Today" value={fmt(stats.active.today)} />
          <StatCard label="Last 7d" value={fmt(stats.active.last7d)} />
          <StatCard label="Last 30d" value={fmt(stats.active.last30d)} />
          <StatCard
            label="Ratio (DAU/MAU)"
            value={
              stats.active.last30d === 0
                ? "—"
                : `${Math.round((stats.active.today / stats.active.last30d) * 100)}%`
            }
            hint="stickiness"
          />
        </StatGrid>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-muted">
          ▸ Submissions
        </h2>
        <StatGrid>
          <StatCard
            label="All time"
            value={fmt(stats.submissions.total)}
            tone="amber"
            delta={{ value: stats.submissions.today, label: "today" }}
          />
          <StatCard label="Today" value={fmt(stats.submissions.today)} />
          <StatCard label="Last 7d" value={fmt(stats.submissions.last7d)} />
          <StatCard
            label="First bloods"
            value={fmt(stats.submissions.firstBloods)}
            hint="bonus points awarded"
          />
        </StatGrid>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-muted">
          ▸ Last 30 days — registrations + submissions
        </h2>
        <TrendBars points={trend} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-muted">
          ▸ Track breakdown
        </h2>
        <table className="w-full text-sm font-mono tabular-nums">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="py-1">Track</th>
              <th className="py-1 text-right">Levels</th>
              <th className="py-1 text-right">Submissions</th>
              <th className="py-1 text-right">Unique solvers</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((t) => (
              <tr key={t.trackSlug} className="border-t border-amber/10">
                <td className="py-2 text-amber">{t.trackName}</td>
                <td className="py-2 text-right">{t.levelCount}</td>
                <td className="py-2 text-right">{t.submissionCount}</td>
                <td className="py-2 text-right">{t.uniqueSolvers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
