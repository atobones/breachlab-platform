import type { DailyTrendPoint } from "@/lib/admin/helpers";

export function TrendBars({ points }: { points: DailyTrendPoint[] }) {
  const maxReg = Math.max(1, ...points.map((p) => p.registrations));
  const maxSub = Math.max(1, ...points.map((p) => p.submissions));
  const firstDay = points[0]?.day ?? "";
  const lastDay = points[points.length - 1]?.day ?? "";

  return (
    <div className="border border-amber/20 p-3 font-mono text-xs">
      <div className="flex items-end gap-[2px] h-24 mb-1">
        {points.map((p) => (
          <div
            key={p.day}
            className="flex-1 flex flex-col justify-end gap-[2px] group relative"
            title={`${p.day}: ${p.registrations} new · ${p.submissions} solves`}
          >
            <div
              className="bg-amber/60"
              style={{
                height: `${(p.submissions / maxSub) * 70}%`,
                minHeight: p.submissions > 0 ? "2px" : "0",
              }}
            />
            <div
              className="bg-green/80"
              style={{
                height: `${(p.registrations / maxReg) * 25}%`,
                minHeight: p.registrations > 0 ? "2px" : "0",
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>{firstDay}</span>
        <span>
          <span className="text-green">■</span> registrations · {" "}
          <span className="text-amber">■</span> submissions
        </span>
        <span>{lastDay}</span>
      </div>
    </div>
  );
}
