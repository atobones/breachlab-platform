import type { DailyTrendPoint } from "@/lib/admin/helpers";

export function TrendBars({ points }: { points: DailyTrendPoint[] }) {
  const maxReg = Math.max(1, ...points.map((p) => p.registrations));
  const maxSub = Math.max(1, ...points.map((p) => p.submissions));
  const firstDay = points[0]?.day ?? "";
  const lastDay = points[points.length - 1]?.day ?? "";
  const totalReg = points.reduce((s, p) => s + p.registrations, 0);
  const totalSub = points.reduce((s, p) => s + p.submissions, 0);

  return (
    <div className="border border-amber/20 p-3 font-mono text-xs">
      <div className="flex gap-2 mb-2">
        <div className="flex flex-col justify-between text-[10px] text-green/80 select-none w-7 text-right py-px">
          <span>{maxReg}</span>
          <span>{Math.round(maxReg / 2)}</span>
          <span>0</span>
        </div>
        <div className="flex items-end gap-px h-32 flex-1 relative border-l border-b border-amber/15">
          <div className="absolute inset-x-0 top-0 border-t border-amber/5" />
          <div className="absolute inset-x-0 top-1/2 border-t border-amber/5" />
          {points.map((p) => (
            <div
              key={p.day}
              className="flex-1 flex items-end gap-[1px] h-full group cursor-default"
              title={`${p.day}: ${p.registrations} new · ${p.submissions} solves`}
            >
              <div
                className="bg-green/70 group-hover:bg-green flex-1 transition-colors"
                style={{ height: `${(p.registrations / maxReg) * 100}%` }}
              />
              <div
                className="bg-amber/60 group-hover:bg-amber flex-1 transition-colors"
                style={{ height: `${(p.submissions / maxSub) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-between text-[10px] text-amber/80 select-none w-7 py-px">
          <span>{maxSub}</span>
          <span>{Math.round(maxSub / 2)}</span>
          <span>0</span>
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>{firstDay}</span>
        <span>
          <span className="text-green">■</span> {totalReg} regs (peak {maxReg}/d) ·{" "}
          <span className="text-amber">■</span> {totalSub} subs (peak {maxSub}/d)
        </span>
        <span>{lastDay}</span>
      </div>
    </div>
  );
}
