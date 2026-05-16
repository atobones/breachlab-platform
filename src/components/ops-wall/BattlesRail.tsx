import Link from "next/link";
import { getKothLiveSummary } from "@/lib/koth/live-summary";

// Ops Wall right-rail (≥2200px). Four archetypes: Predator (LIVE) +
// Ghost / Clash / Crew (STAGED). Predator card pulls live arena state
// from the DB on every render — round age, king + hold, vacant marker.
//
// Server component; no client JS. Page-level revalidation re-renders
// the rail.

type Status = "live" | "staged";

type Archetype = {
  code: string;
  name: string;
  glyph: string;
  accent: "amber" | "cyan" | "red" | "green";
  status: Status;
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
    status: "live",
    tagline: "Take the crown. Hold ground. Watch your back path.",
    rhythm: "24/7 · 30-min rounds · solo arena",
    liveLine: "", // overridden at render time with live arena state
  },
  {
    code: "OPS-02",
    name: "GHOST",
    glyph: "◐",
    accent: "cyan",
    status: "staged",
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

export async function BattlesRail() {
  // Pull live arena state for the Predator card. Tolerant of failure
  // (e.g. DB unreachable during deploy) — falls back to a generic
  // "first-wave" message so the rail keeps rendering.
  let predatorLine = "first wave · cohort registration open";
  let predatorLive = true;
  try {
    const summary = await getKothLiveSummary();
    predatorLine = summary.oneLiner;
    predatorLive = summary.hasRound;
  } catch {
    // keep fallback
  }

  // Inject live state into the Predator card; others stay STAGED.
  const archetypes = ARCHETYPES.map((a) =>
    a.code === "OPS-01"
      ? { ...a, liveLine: predatorLine, status: predatorLive ? "live" : "staged" as Status }
      : a,
  );

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
      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 flex flex-col gap-1.5">
        {archetypes.map((a) => {
          const c = ACCENT[a.accent];
          const isLive = a.status === "live";
          // Predator gets the live amber/red treatment; others stay
          // muted with the staged tag.
          return (
            <Link
              key={a.code}
              href={a.code === "OPS-01" ? "/battles/koth" : "/battles"}
              className={`block border ${c.border} ${c.bg} transition-colors group`}
            >
              {/* Card head */}
              <div
                className={`flex items-center justify-between gap-2 border-b ${c.border} px-2.5 py-1 text-[9px] font-mono tracking-[0.18em] uppercase`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`${c.line} font-bold`}>{a.code}</span>
                  <span className="text-muted">·</span>
                  <span className="text-muted truncate">dossier</span>
                </div>
                <span className={`px-1 py-0 border ${c.tag} shrink-0`}>
                  {isLive ? "live" : "incoming"}
                </span>
              </div>

              {/* Card body */}
              <div className="flex gap-2.5 px-2.5 py-2">
                <div
                  className={`${c.line} text-2xl leading-none shrink-0 w-7 text-center phosphor select-none pt-0.5`}
                  aria-hidden
                >
                  {a.glyph}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span
                    className={`${c.line} text-xs wordmark tracking-[0.08em] font-bold`}
                  >
                    {a.name}
                  </span>
                  <p className="text-[10px] text-text/85 leading-snug">
                    {a.tagline}
                  </p>
                  <div className={`text-[9px] ${c.soft} font-mono leading-snug`}>
                    {a.rhythm}
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] pt-0.5">
                    {isLive ? (
                      <span className="pulse-dot text-green">●</span>
                    ) : (
                      <span className="text-muted/50">○</span>
                    )}
                    <span className="text-muted tracking-wider truncate">
                      {a.liveLine}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {/* Footer CTA */}
        <div className="border-t border-amber/10 pt-2 mt-1 flex items-center justify-between text-[10px] font-mono">
          <span className="text-muted leading-snug">
            first wave · free entry to all four arenas
          </span>
          <Link
            href="/battles"
            className="btn-bracket text-amber text-[10px] tracking-[0.18em]"
          >
            Open Theater
          </Link>
        </div>
      </div>
    </section>
  );
}
