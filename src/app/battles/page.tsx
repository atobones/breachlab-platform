import Link from "next/link";

export const metadata = {
  title: "Battles — BreachLab",
  description:
    "Operational theater for the field-ready operator. Four archetypes — Predator, Ghost, Clash, Crew — across four arenas of real-time tradecraft against thinking adversaries.",
};

type Status = "live" | "staged";

type Archetype = {
  code: string;
  codename: string;
  glyph: string;
  accent: "amber" | "cyan" | "red" | "green";
  status: Status;
  pitch: string;
  doctrine: string;
  tradecraft: string[];
  // For 'live' archetypes — where ENGAGE clicks through.
  arenaHref?: string;
};

const ARCHETYPES: Archetype[] = [
  {
    code: "OPS-01",
    codename: "PREDATOR",
    glyph: "⌖",
    accent: "amber",
    status: "live",
    arenaHref: "/battles/koth",
    pitch: "Solo arena · drop-in · 24/7 crown wars",
    doctrine:
      "Take the crown. Hold it. The box mutates in real time — playbooks die against thinking opponents.",
    tradecraft: [
      "Live mutation — defender closes your entry path",
      "AI Defender incoming — an LLM sysadmin inside the box",
    ],
  },
  {
    code: "OPS-02",
    codename: "GHOST",
    glyph: "◐",
    accent: "cyan",
    status: "staged",
    pitch: "1 target vs N analysts · OSINT war · 24h windows",
    doctrine:
      "One operator goes dark. Everyone else hunts them. Score every hour invisible — or every accurate attribution.",
    tradecraft: [
      "Evidence graded A1-F6 — bad intel costs you points",
      "Target plants false flags before going dark — pure human deception",
    ],
  },
  {
    code: "OPS-03",
    codename: "CLASH",
    glyph: "⚔",
    accent: "red",
    status: "staged",
    pitch: "Team PvP · 2v2 or 3v3 · 30-45 min pickup",
    doctrine:
      "Two crews. Asymmetric infrastructure. Patch faster than they break, break faster than they patch.",
    tradecraft: [
      "Asymmetric service pairs — each round you defend a stack you've never seen",
      "Path-attributed patch scoring · close what they took",
    ],
  },
  {
    code: "OPS-04",
    codename: "CREW",
    glyph: "▲▴▴",
    accent: "green",
    status: "staged",
    pitch: "Coop APT raid · 3-5 specialists · bi-weekly flagship",
    doctrine:
      "Pick a role. Move as a crew through layered defense — WAF, EDR, SIEM, LLM-driven SOC analyst. Detection bleeds the team.",
    tradecraft: [
      "Role-bound toolkits — each operative sees their slice",
      "Live AI SOC analyst on defense — reads logs, fires alerts, rotates keys",
    ],
  },
];

const ACCENT: Record<
  Archetype["accent"],
  { line: string; tag: string; border: string; bg: string; soft: string }
> = {
  amber: {
    line: "text-amber",
    tag: "border-amber/60 text-amber bg-amber/5",
    border: "border-amber/40",
    bg: "bg-amber/[0.02]",
    soft: "text-amber/70",
  },
  cyan: {
    line: "text-[#34d8ff]",
    tag: "border-[#34d8ff]/60 text-[#34d8ff] bg-[#34d8ff]/5",
    border: "border-[#34d8ff]/30",
    bg: "bg-[#34d8ff]/[0.02]",
    soft: "text-[#34d8ff]/70",
  },
  red: {
    line: "text-red-400",
    tag: "border-red-400/60 text-red-400 bg-red-400/5",
    border: "border-red-400/30",
    bg: "bg-red-400/[0.02]",
    soft: "text-red-400/70",
  },
  green: {
    line: "text-green",
    tag: "border-green/60 text-green bg-green/5",
    border: "border-green/30",
    bg: "bg-green/[0.02]",
    soft: "text-green/70",
  },
};

function ClassifiedBar() {
  return (
    <div
      aria-hidden
      className="font-mono text-[10px] tracking-[0.3em] text-amber/40 select-none overflow-hidden whitespace-nowrap"
    >
      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ CLASSIFIED // OPERATOR-EYES-ONLY // BL-OPS-DOSSIER-2026Q2 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
    </div>
  );
}

function DossierCard({ a }: { a: Archetype }) {
  const c = ACCENT[a.accent];
  const isLive = a.status === "live";

  return (
    <article
      className={`relative border ${c.border} ${c.bg} terminal-frame`}
      data-testid={`dossier-${a.codename.toLowerCase()}`}
    >
      {/* Header bar — code + status */}
      <div
        className={`flex items-center justify-between gap-3 border-b ${c.border} px-3 py-1.5 text-[10px] font-mono tracking-[0.18em] uppercase`}
      >
        <span className={`${c.line} font-bold`}>{a.code}</span>
        <div className="flex items-center gap-1.5">
          {isLive && <span className="pulse-dot text-green">●</span>}
          <span className={`px-1.5 py-0.5 border ${c.tag}`}>
            {isLive ? "live" : "incoming"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 sm:px-5 py-3.5 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-5 gap-y-3">
        {/* Glyph column */}
        <div className="hidden sm:flex flex-col items-center justify-start pt-0.5 gap-1">
          <div
            className={`${c.line} text-3xl leading-none phosphor`}
            aria-hidden
          >
            {a.glyph}
          </div>
        </div>

        {/* Info column */}
        <div className="space-y-2.5 min-w-0">
          {/* Codename + pitch */}
          <div className="space-y-0.5">
            <h2 className={`${c.line} wordmark text-lg sm:text-xl font-bold tracking-[0.06em] leading-none`}>
              {a.codename}
            </h2>
            <div className={`${c.soft} text-[11px] font-mono`}>
              {a.pitch}
            </div>
          </div>

          {/* Doctrine — one short sentence */}
          <p className="text-[13px] leading-relaxed text-text">
            {a.doctrine}
          </p>

          {/* Tradecraft — 2 signature lines */}
          <ul className="text-[11px] leading-snug text-muted space-y-0.5 font-mono">
            {a.tradecraft.map((t, i) => (
              <li key={i} className="flex gap-1.5">
                <span className={`${c.line} shrink-0 opacity-70`}>›</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>

          {/* Authorization footer */}
          <div className="pt-2 flex items-center justify-end">
            {isLive && a.arenaHref ? (
              <Link
                href={a.arenaHref}
                className="btn-bracket text-[11px]"
                style={{
                  color:
                    a.accent === "cyan"
                      ? "#34d8ff"
                      : a.accent === "red"
                      ? "#f87171"
                      : a.accent === "green"
                      ? "var(--bl-green)"
                      : "var(--bl-amber)",
                }}
              >
                Engage Arena →
              </Link>
            ) : (
              <span className="text-[10px] text-muted/80 font-mono uppercase tracking-[0.18em]">
                Clearance pending
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function BattlesPage() {
  return (
    <article className="space-y-5 max-w-3xl" data-testid="battles-page">
      {/* Hero */}
      <header className="space-y-3">
        <ClassifiedBar />

        <div className="space-y-2">
          <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono">
            ▸ operational theater
          </div>
          <h1 className="text-amber text-3xl sm:text-4xl phosphor wordmark font-bold tracking-[0.08em]">
            <span className="glitch" data-text="BATTLES">
              BATTLES
            </span>
          </h1>
        </div>
      </header>

      {/* Dossier stack */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-amber text-sm font-mono tracking-[0.18em] uppercase">
            ▸ operative dossiers
          </h2>
          <span className="text-[10px] text-muted font-mono tracking-[0.18em] uppercase">
            04 archetypes // 01 incoming
          </span>
        </div>

        {ARCHETYPES.map((a) => (
          <DossierCard key={a.code} a={a} />
        ))}
      </section>

      {/* Engage block — final CTA */}
      <section className="border border-amber/40 bg-amber/[0.03] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-0.5">
          <div className="text-[10px] text-amber/80 tracking-[0.3em] uppercase font-mono">
            ▸ predator arena · live
          </div>
          <p className="text-[12px] text-text leading-snug max-w-xl">
            Register your SSH key, get a slot, and ssh into the arena. Three
            exploit paths to root. 20-min rolling rounds.
          </p>
        </div>
        <Link
          href="/battles/koth"
          className="btn-bracket text-amber text-[12px] font-mono whitespace-nowrap"
        >
          Enter Crown Wars
        </Link>
      </section>

      <footer className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted font-mono">
        <Link href="/" className="hover:text-amber tracking-[0.18em] uppercase">
          ← back to lab
        </Link>
        <span className="tracking-[0.18em] uppercase">
          breachlab // ops-doctrine-v2
        </span>
      </footer>
    </article>
  );
}
