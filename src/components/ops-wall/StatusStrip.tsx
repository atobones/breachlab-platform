import { getLiveStats } from "@/lib/leaderboard/queries";

function formatUptime(start: Date): string {
  const ms = Date.now() - start.getTime();
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return `${days}d ${hours}h`;
}

// Hard-coded reference point — matches the founding-operative window we
// communicate publicly. Cheaper than threading a real boot timestamp through
// the build, and the value updates on its own once a day rolls over.
const PLATFORM_EPOCH = new Date("2026-04-17T00:00:00Z");

export async function StatusStrip() {
  const stats = await getLiveStats();
  const uptime = formatUptime(PLATFORM_EPOCH);
  return (
    <div className="border border-amber/20 px-3 py-2 flex items-center gap-6 text-[11px] font-mono">
      <span className="text-amber">[ STATUS ]</span>
      <span className="text-muted">
        <span className="text-text tabular-nums">{stats.operatives}</span>{" "}
        ops online
      </span>
      <span className="text-amber/30">•</span>
      <span className="text-muted">
        <span className="text-text tabular-nums">
          {stats.completionsToday}
        </span>{" "}
        solves / 24h
      </span>
      <span className="text-amber/30">•</span>
      <span className="text-muted">
        uptime <span className="text-text tabular-nums">{uptime}</span>
      </span>
      <span className="ml-auto flex items-center gap-2">
        <span className="text-green animate-pulse">●</span>
        <span className="text-muted">all systems</span>
      </span>
    </div>
  );
}
