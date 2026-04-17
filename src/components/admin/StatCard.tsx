export type StatDelta = {
  value: number;
  label?: string; // e.g. "today", "7d"
};

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  delta,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "amber" | "green";
  delta?: StatDelta;
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber"
      : tone === "green"
        ? "text-green"
        : "text-text";
  return (
    <div className="border border-amber/20 hover:border-amber/40 p-3 font-mono tabular-nums transition-colors">
      <div className="text-[10px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className={`text-2xl ${toneClass}`}>{value}</div>
        {delta && delta.value !== 0 ? (
          <div
            className={`text-[11px] ${
              delta.value > 0 ? "text-green" : "text-muted"
            }`}
          >
            {delta.value > 0 ? "↑" : "↓"}
            {Math.abs(delta.value)}
            {delta.label ? ` ${delta.label}` : ""}
          </div>
        ) : null}
      </div>
      {hint ? (
        <div className="text-[11px] text-muted mt-1">{hint}</div>
      ) : null}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>
  );
}
