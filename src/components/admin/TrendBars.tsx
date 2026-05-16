import type { DailyTrendPoint } from "@/lib/admin/helpers";

export function TrendBars({ points }: { points: DailyTrendPoint[] }) {
  const maxReg = Math.max(1, ...points.map((p) => p.registrations));
  const maxSub = Math.max(1, ...points.map((p) => p.submissions));
  // Shared scale across both series — when subs dwarfs regs (which it does
  // by ~7x), the green bars visually shrink against the amber towers
  // instead of pretending the two metrics have comparable magnitudes via
  // independent normalization.
  const sharedMax = Math.max(maxReg, maxSub);
  const firstDay = points[0]?.day ?? "";
  const lastDay = points[points.length - 1]?.day ?? "";
  const totalReg = points.reduce((s, p) => s + p.registrations, 0);
  const totalSub = points.reduce((s, p) => s + p.submissions, 0);

  return (
    <div className="border border-amber/20 p-3 font-mono text-xs">
      <div className="flex gap-2 mb-2">
        <div className="flex flex-col justify-between text-[10px] text-amber/80 select-none w-9 text-right py-px">
          <span>{sharedMax}</span>
          <span>{Math.round((sharedMax * 3) / 4)}</span>
          <span>{Math.round(sharedMax / 2)}</span>
          <span>{Math.round(sharedMax / 4)}</span>
          <span>0</span>
        </div>
        <div className="flex items-end gap-px h-72 flex-1 relative border-l border-b border-amber/15">
          <div className="absolute inset-x-0 top-0 border-t border-amber/5" />
          <div className="absolute inset-x-0 top-1/4 border-t border-amber/5" />
          <div className="absolute inset-x-0 top-1/2 border-t border-amber/5" />
          <div className="absolute inset-x-0 top-3/4 border-t border-amber/5" />
          {points.map((p) => (
            <div
              key={p.day}
              className="flex-1 flex items-end gap-[1px] h-full group cursor-default"
              title={`${p.day}: ${p.registrations} new · ${p.submissions} solves`}
            >
              <div
                className="bg-green/70 group-hover:bg-green flex-1 transition-all"
                style={{ height: `${(p.registrations / sharedMax) * 100}%` }}
              />
              <div
                className="bg-amber/60 group-hover:bg-amber flex-1 transition-all"
                style={{ height: `${(p.submissions / sharedMax) * 100}%` }}
              />
            </div>
          ))}
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
