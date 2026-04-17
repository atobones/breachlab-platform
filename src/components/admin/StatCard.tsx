export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "amber" | "green";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber"
      : tone === "green"
        ? "text-green"
        : "text-foreground";
  return (
    <div className="border border-amber/20 p-3 font-mono">
      <div className="text-[10px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className={`text-2xl ${toneClass} mt-1`}>{value}</div>
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
