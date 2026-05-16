import Link from "next/link";

// Sidebar Battles entry. Narrow-viewport surface (< 2200px) — at ultrawide
// the Battles experience lives in the Ops Wall rail and this widget hides
// via `3xl:hidden`. Four archetype codes flashed as a single dossier-card
// CTA into `/battles`.

const ARCHETYPES = [
  { code: "PREDATOR", short: "PRED", color: "text-amber" },
  { code: "GHOST", short: "GHST", color: "text-[#34d8ff]" },
  { code: "CLASH", short: "CLSH", color: "text-red-400" },
  { code: "CREW", short: "CREW", color: "text-green" },
] as const;

export function BattlesWidget() {
  return (
    <section className="3xl:hidden">
      <h2 className="text-muted text-sm uppercase mb-2 flex items-center gap-2 tracking-[0.18em]">
        ▸ Battles
        <span className="pulse-dot text-green text-[8px]">●</span>
        <span className="text-[9px] text-green/80 border border-green/40 px-1 rounded uppercase tracking-wider font-mono">
          first wave
        </span>
      </h2>

      <Link
        href="/battles"
        className="block border border-amber/30 bg-amber/[0.02] hover:bg-amber/[0.06] hover:border-amber/70 transition-colors group"
      >
        <div className="p-2 space-y-1.5">
          {/* Archetype roster — flashes the four codes */}
          <div className="flex items-center gap-1 font-mono text-[10px] font-bold tracking-[0.08em] flex-wrap">
            {ARCHETYPES.map((a, i) => (
              <span key={a.code} className="flex items-center gap-1">
                <span className={a.color}>{a.short}</span>
                {i < ARCHETYPES.length - 1 && (
                  <span className="text-muted/50">·</span>
                )}
              </span>
            ))}
          </div>

          <div className="text-muted text-[11px] leading-snug">
            Four archetypes. Real-time tradecraft.
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[9px] text-muted tracking-wider uppercase font-mono">
              04 · 01 incoming
            </span>
            <span className="text-[10px] text-amber/80 group-hover:text-amber tracking-[0.18em] uppercase font-mono">
              enter →
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}
