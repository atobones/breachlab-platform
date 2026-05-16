import Link from "next/link";

// Ops Wall right-rail (≥2200px). Pre-launch Battles surface — four
// archetypes (Predator / Ghost / Clash / Crew). Predator (KoTH) ships
// first as Phase 1; the rest are STAGED with phase markers.
//
// No JS, no client state. Live counters here are pre-launch placeholders;
// once Phase 1 backend is wired (`/api/koth/state`), swap in real numbers
// and keep the same visual contract.

type Status = "incoming" | "staged";

type Archetype = {
  code: string;
  name: string;
  glyph: string;
  accent: "amber" | "cyan" | "red" | "green";
  status: Status;
  phase: string;
  tagline: string;
  rhythm: string;
  // Pre-launch telemetry — replace with live values once backend is up.
  liveLine: string;
};

const ARCHETYPES: Archetype[] = [
  {
    code: "OPS-01",
    name: "PREDATOR",
    glyph: "⌖",
    accent: "amber",
    status: "incoming",
    phase: "Phase 1",
    tagline: "Take the crown. Hold ground. Watch your back path.",
    rhythm: "24/7 · 20-min rounds · solo arena",
    liveLine: "first-wave incoming · cohort registration open",
  },
  {
    code: "OPS-02",
    name: "GHOST",
    glyph: "◐",
    accent: "cyan",
    status: "staged",
    phase: "Phase 2",
    tagline: "Go dark. Stay invisible. Score every hour.",
    rhythm: "24-hour asymmetric · 1 vs N analysts",
    liveLine: "staged · post-Specter IV",
  },
  {
    code: "OPS-03",
    name: "CLASH",
    glyph: "⚔",
    accent: "red",
    status: "staged",
    phase: "Phase 3",
    tagline: "Rival crews. Asymmetric infra. AI co-defender.",
    rhythm: "Pickup · 30-45 min · 2v2 / 3v3",
    liveLine: "staged · team PvP arena",
  },
  {
    code: "OPS-04",
    name: "CREW",
    glyph: "▲▴▴",
    accent: "green",
    status: "staged",
    phase: "Phase 4",
    tagline: "Pick a role. Run the kill chain. Don't trip the AI SOC.",
    rhythm: "Bi-weekly scheduled · 90-min flagship",
    liveLine: "staged · flagship event tier",
  },
];

const ACCENT: Record<
  Archetype["accent"],
  { line: string; border: string; bg: string; soft: string; tag: string }
> = {
  amber: {
    line: "text-amber",
    border: "border-amber/40",
    bg: "hover:bg-amber/[0.04]",
    soft: "text-amber/70",
    tag: "border-amber/60 text-amber bg-amber/5",
  },
  cyan: {
    line: "text-[#34d8ff]",
    border: "border-[#34d8ff]/30",
    bg: "hover:bg-[#34d8ff]/[0.03]",
    soft: "text-[#34d8ff]/70",
    tag: "border-[#34d8ff]/60 text-[#34d8ff] bg-[#34d8ff]/5",
  },
  red: {
    line: "text-red-400",
    border: "border-red-400/30",
    bg: "hover:bg-red-400/[0.03]",
    soft: "text-red-400/70",
    tag: "border-red-400/60 text-red-400 bg-red-400/5",
  },
  green: {
    line: "text-green",
    border: "border-green/30",
    bg: "hover:bg-green/[0.03]",
    soft: "text-green/70",
    tag: "border-green/60 text-green bg-green/5",
  },
};

export function BattlesRail() {
  return (
    <section className="border border-amber/30 flex flex-col flex-1 min-w-0 min-h-0">
      {/* Header — classified tape feel */}
      <header className="border-b border-amber/20 shrink-0">
        <div className="flex items-center justify-between px-3 py-2 text-[11px] font-mono">
          <div className="flex items-center gap-3">
            <span className="text-amber tracking-[0.18em] uppercase">
              [ operational theater ]
            </span>
            <span className="text-muted">·</span>
            <span className="text-muted">04 archetypes</span>
          </div>
          <div className="flex items-center gap-2 tabular-nums">
            <span className="pulse-dot text-green">●</span>
            <span className="text-green tracking-[0.18em] uppercase text-[10px]">
              first wave
            </span>
          </div>
        </div>
        <div
          aria-hidden
          className="font-mono text-[9px] tracking-[0.3em] text-amber/30 select-none overflow-hidden whitespace-nowrap px-3 pb-1.5"
        >
          ▓▓▓ classified · operator-eyes only · bl-ops-doctrine-v2 ▓▓▓
        </div>
      </header>

      {/* Archetype list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2.5">
        {ARCHETYPES.map((a) => {
          const c = ACCENT[a.accent];
          const isLive = a.status === "incoming";
          return (
            <Link
              key={a.code}
              href="/battles"
              className={`block border ${c.border} ${c.bg} transition-colors group`}
            >
              {/* Card head */}
              <div
                className={`flex items-center justify-between gap-3 border-b ${c.border} px-3 py-1.5 text-[10px] font-mono tracking-[0.18em] uppercase`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`${c.line} font-bold`}>{a.code}</span>
                  <span className="text-muted">·</span>
                  <span className="text-muted truncate">dossier</span>
                </div>
                <span className={`px-1.5 py-0.5 border ${c.tag} shrink-0`}>
                  {isLive ? "incoming" : "staged"} · {a.phase}
                </span>
              </div>

              {/* Card body */}
              <div className="flex gap-3 px-3 py-3">
                <div
                  className={`${c.line} text-[28px] leading-none shrink-0 w-9 text-center phosphor select-none`}
                  aria-hidden
                >
                  {a.glyph}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className={`${c.line} text-sm wordmark tracking-[0.08em] font-bold`}
                    >
                      {a.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-text/85 leading-snug">
                    {a.tagline}
                  </p>
                  <div className={`text-[10px] ${c.soft} font-mono`}>
                    {a.rhythm}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] pt-0.5">
                    {isLive ? (
                      <span className="pulse-dot text-green">●</span>
                    ) : (
                      <span className="text-muted/50">○</span>
                    )}
                    <span className="text-muted tracking-wider">
                      {a.liveLine}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {/* Footer CTA */}
        <div className="border-t border-amber/10 pt-3 mt-1 flex items-center justify-between text-[11px] font-mono">
          <span className="text-muted leading-snug">
            first wave gets free entry to all four arenas
          </span>
          <Link
            href="/battles"
            className="btn-bracket text-amber text-[11px] tracking-[0.18em]"
          >
            Open Theater
          </Link>
        </div>
      </div>
    </section>
  );
}
