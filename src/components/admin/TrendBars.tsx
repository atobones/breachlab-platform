import type { DailyTrendPoint } from "@/lib/admin/helpers";

type Tone = "green" | "amber";

const TONE_CLASSES: Record<
  Tone,
  {
    axisText: string;
    bar: string;
    barHover: string;
    legendDot: string;
  }
> = {
  green: {
    axisText: "text-green/80",
    bar: "bg-green/70",
    barHover: "group-hover:bg-green",
    legendDot: "text-green",
  },
  amber: {
    axisText: "text-amber/80",
    bar: "bg-amber/70",
    barHover: "group-hover:bg-amber",
    legendDot: "text-amber",
  },
};

function Panel({
  points,
  pick,
  tone,
  label,
  unit,
}: {
  points: DailyTrendPoint[];
  pick: (p: DailyTrendPoint) => number;
  tone: Tone;
  label: string;
  unit: string;
}) {
  const max = Math.max(1, ...points.map(pick));
  const total = points.reduce((s, p) => s + pick(p), 0);
  const cls = TONE_CLASSES[tone];

  return (
    <div className="flex gap-2">
      <div
        className={`flex flex-col justify-between text-[10px] ${cls.axisText} select-none w-9 text-right py-px`}
      >
        <span>{max}</span>
        <span>{Math.round((max * 3) / 4)}</span>
        <span>{Math.round(max / 2)}</span>
        <span>{Math.round(max / 4)}</span>
        <span>0</span>
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-end gap-px h-44 relative border-l border-b border-amber/15">
          <div className="absolute inset-x-0 top-0 border-t border-amber/5" />
          <div className="absolute inset-x-0 top-1/4 border-t border-amber/5" />
          <div className="absolute inset-x-0 top-1/2 border-t border-amber/5" />
          <div className="absolute inset-x-0 top-3/4 border-t border-amber/5" />
          {points.map((p) => {
            const v = pick(p);
            return (
              <div
                key={p.day}
                className="flex-1 flex items-end h-full group cursor-default"
                title={`${p.day}: ${v} ${unit}`}
              >
                <div
                  className={`${cls.bar} ${cls.barHover} flex-1 transition-all`}
                  style={{ height: `${(v / max) * 100}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="text-[10px] text-muted pt-1">
          <span className={cls.legendDot}>■</span> {label} — {total} total ·
          peak {max}/d
        </div>
      </div>
    </div>
  );
}

export function TrendBars({ points }: { points: DailyTrendPoint[] }) {
  const firstDay = points[0]?.day ?? "";
  const lastDay = points[points.length - 1]?.day ?? "";

  return (
    <div className="border border-amber/20 p-3 font-mono text-xs space-y-4">
      <Panel
        points={points}
        pick={(p) => p.registrations}
        tone="green"
        label="registrations"
        unit="new"
      />
      <Panel
        points={points}
        pick={(p) => p.submissions}
        tone="amber"
        label="submissions"
        unit="solves"
      />
      <div className="flex justify-between text-[10px] text-muted">
        <span>{firstDay}</span>
        <span>{lastDay}</span>
      </div>
    </div>
  );
}
