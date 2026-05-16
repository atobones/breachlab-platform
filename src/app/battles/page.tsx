import Link from "next/link";
import { DISCORD_INVITE_URL } from "@/lib/links";

export const metadata = {
  title: "Battles — BreachLab",
  description:
    "Operational theater for the field-ready operator. Four archetypes — Predator, Ghost, Clash, Crew — across four arenas of real-time tradecraft against thinking adversaries.",
};

type Status = "incoming" | "staged";

type Archetype = {
  code: string;
  codename: string;
  glyph: string;
  accent: "amber" | "cyan" | "red" | "green";
  status: Status;
  phase: string;
  archetype: string;
  theater: string;
  doctrine: string;
  tradecraft: string[];
  domain: string;
  rhythm: string;
  scale: string;
};

const ARCHETYPES: Archetype[] = [
  {
    code: "OPS-01",
    codename: "PREDATOR",
    glyph: "⌖",
    accent: "amber",
    status: "incoming",
    phase: "Phase 1 deployment",
    archetype: "Solo combat operator · drop-in / drop-out",
    theater: "Crown Wars · 24/7 persistent arena",
    rhythm: "24/7 rolling 20-min rounds",
    scale: "1 vs all",
    domain: "Linux post-ex · real-time defensive thinking · anti-forensics",
    doctrine:
      "Take the crown. Hold it. Watch every path you came through before someone closes it on you. The box mutates in real time — playbooks die against thinking opponents.",
    tradecraft: [
      "Phantom L7-L9 SUID · L17 Redis privesc",
      "Live mutation patch (defender closes your entry)",
      "AI Defender (Phase 3) — LLM-driven sysadmin NPC",
      "Escalation ladder — crown >5 min opens new attack surface",
    ],
  },
  {
    code: "OPS-02",
    codename: "GHOST",
    glyph: "◐",
    accent: "cyan",
    status: "staged",
    phase: "Phase 2 · post-Specter IV",
    archetype: "Counterintelligence operative · 1 target vs N analysts",
    theater: "Manhunt · 24-hour asymmetric intel war",
    rhythm: "24-hour async windows",
    scale: "1 target · N analysts",
    domain: "OSINT · counterintel · identity warfare · deception",
    doctrine:
      "One operator goes dark. Everyone else hunts them. Plant false flags, fake identities, OPSEC traps — score every hour you stay invisible. Analysts score on attribution: name, location, real face, complete dossier.",
    tradecraft: [
      "Specter I-IV OSINT toolkit",
      "NATO Admiralty A1-F6 source grading (from Specter L4)",
      "AI noise generator weaves decoy footprints",
      "Asymmetric scoring — every hour matters",
    ],
  },
  {
    code: "OPS-03",
    codename: "CLASH",
    glyph: "⚔",
    accent: "red",
    status: "staged",
    phase: "Phase 3 · team PvP",
    archetype: "Rival-team operative · 2v2 / 3v3",
    theater: "Clash · pickup team attack-defense with AI allies",
    rhythm: "Drop-in pickup · 30-45 min matches",
    scale: "2v2 or 3v3 with AI co-defender",
    domain: "Full-stack offense + defense · team coordination · AI partnership",
    doctrine:
      "Two crews. Asymmetric infrastructure. Each side defends a different stack while breaking the other. Your AI partner reads logs and patches alongside you — hostile crew has the same. The mind-fight that real ops actually look like.",
    tradecraft: [
      "Asymmetric service pairs (web/redis vs ssh/cron infra)",
      "AI defender as ally — not enemy",
      "Path-attributed patch scoring (close what they took)",
      "Flag rotation every 3-5 min — rewards persistent C2",
    ],
  },
  {
    code: "OPS-04",
    codename: "CREW",
    glyph: "▲▴▴▴",
    accent: "green",
    status: "staged",
    phase: "Phase 4 · flagship event tier",
    archetype: "APT-style cooperative crew · 3-5 ops with role specialization",
    theater: "Heist · scheduled bi-weekly raid on fortified AI-defended target",
    rhythm: "Scheduled · 90-min flagship events",
    scale: "3-5 specialists vs AI SOC + layered defense",
    domain: "Real-world APT tradecraft · role specialization · kill-chain ops",
    doctrine:
      "Pick a role: Recon, Exploit Dev, Post-Ex, Persistence, Exfil. Move as a crew through layered defense — WAF, EDR, SIEM, LLM-driven SOC analyst. Score per phase: initial access, pivot, privesc, lateral, objective, exfil. Detection at any phase bleeds the team.",
    tradecraft: [
      "Role-bound toolkits — each operative sees their slice",
      "Full AI SOC analyst on defense (Specter IV harness)",
      "Real APT campaign archetypes — banks, SaaS, gov targets",
      "Long-form clip-worthy 90-min ops",
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

function StatusBanner() {
  return (
    <div className="border border-amber/30 bg-amber/[0.02] px-3 py-2 flex items-center gap-4 flex-wrap text-[11px] font-mono tabular-nums">
      <span className="flex items-center gap-2">
        <span className="pulse-dot text-green">●</span>
        <span className="text-muted uppercase tracking-widest">
          theater status
        </span>
      </span>
      <span className="text-amber">ARENA-01 // PREDATOR</span>
      <span className="text-muted">·</span>
      <span className="text-green">FIRST-WAVE INCOMING</span>
      <span className="text-muted">·</span>
      <span className="text-text/80">
        operator briefing imminent · join Discord for cohort access
      </span>
    </div>
  );
}

function DossierCard({ a }: { a: Archetype }) {
  const c = ACCENT[a.accent];
  const isLive = a.status === "incoming";

  return (
    <article
      className={`relative border ${c.border} ${c.bg} terminal-frame`}
      data-testid={`dossier-${a.codename.toLowerCase()}`}
    >
      {/* Header bar — file tab + status */}
      <div
        className={`flex items-center justify-between gap-3 border-b ${c.border} px-3 py-1.5 text-[10px] font-mono tracking-[0.18em] uppercase`}
      >
        <div className="flex items-center gap-3">
          <span className={`${c.line} font-bold`}>{a.code}</span>
          <span className="text-muted">·</span>
          <span className="text-muted">dossier // {a.codename.toLowerCase()}</span>
        </div>
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="pulse-dot text-green">●</span>
          ) : (
            <span className="text-muted/60">○</span>
          )}
          <span className={`px-1.5 py-0.5 border ${c.tag}`}>
            {isLive ? "INCOMING" : "STAGED"} · {a.phase}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 sm:px-7 py-6 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-7 gap-y-4">
        {/* Glyph column */}
        <div className="hidden sm:flex flex-col items-center justify-start pt-1 gap-2">
          <div
            className={`${c.line} text-5xl leading-none phosphor`}
            aria-hidden
          >
            {a.glyph}
          </div>
          <div className={`text-[9px] ${c.soft} tracking-widest`}>
            {a.codename}
          </div>
        </div>

        {/* Info column */}
        <div className="space-y-4 min-w-0">
          {/* Codename row — display face */}
          <div className="space-y-1">
            <div className="text-[10px] text-muted tracking-[0.3em] uppercase">
              codename
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className={`${c.line} wordmark text-2xl sm:text-3xl font-bold tracking-[0.06em]`}>
                {a.codename}
              </h2>
              <span className={`${c.soft} text-[11px] sm:text-xs italic`}>
                {a.archetype}
              </span>
            </div>
          </div>

          {/* Meta grid — theater / rhythm / scale */}
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2 text-[11px] font-mono border-y border-border/60 py-3">
            <div className="space-y-0.5">
              <dt className="text-muted/80 tracking-[0.18em] uppercase text-[9px]">
                theater
              </dt>
              <dd className="text-text">{a.theater}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-muted/80 tracking-[0.18em] uppercase text-[9px]">
                rhythm
              </dt>
              <dd className="text-text">{a.rhythm}</dd>
            </div>
            <div className="space-y-0.5">
              <dt className="text-muted/80 tracking-[0.18em] uppercase text-[9px]">
                scale
              </dt>
              <dd className="text-text">{a.scale}</dd>
            </div>
          </dl>

          {/* Doctrine */}
          <div className="space-y-1.5">
            <div className={`text-[10px] ${c.soft} tracking-[0.3em] uppercase`}>
              ─ doctrine
            </div>
            <p className="text-sm leading-relaxed text-text">{a.doctrine}</p>
          </div>

          {/* Tradecraft */}
          <div className="space-y-1.5">
            <div className={`text-[10px] ${c.soft} tracking-[0.3em] uppercase`}>
              ─ tradecraft
            </div>
            <ul className="text-[13px] leading-relaxed text-text space-y-1 font-mono">
              {a.tradecraft.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <span className={`${c.line} shrink-0`}>›</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Domain */}
          <div className="space-y-1.5">
            <div className={`text-[10px] ${c.soft} tracking-[0.3em] uppercase`}>
              ─ skill domain
            </div>
            <p className="text-[12px] text-muted font-mono leading-relaxed">
              {a.domain}
            </p>
          </div>

          {/* Authorization footer */}
          <div className="pt-2 mt-2 border-t border-border/60 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-[10px] text-muted tracking-[0.3em] uppercase">
              ─ authorization
            </div>
            {isLive ? (
              <a
                href={DISCORD_INVITE_URL}
                rel="noreferrer"
                className={`btn-bracket text-[12px] ${c.line}`}
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
              </a>
            ) : (
              <span className="text-[11px] text-muted/80 font-mono uppercase tracking-[0.18em]">
                Clearance pending · {a.phase}
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
    <article className="space-y-8 max-w-4xl" data-testid="battles-page">
      {/* Hero */}
      <header className="space-y-4">
        <ClassifiedBar />

        <div className="space-y-2">
          <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono">
            ▸ operational theater
          </div>
          <h1 className="text-amber text-5xl sm:text-6xl phosphor wordmark font-bold tracking-[0.08em]">
            <span className="glitch" data-text="BATTLES">
              BATTLES
            </span>
          </h1>
          <p className="text-muted text-sm leading-relaxed max-w-2xl">
            Four operator archetypes. Four arenas. Real-time tradecraft against
            thinking adversaries — not puzzle boxes. This is where the
            campaign-trained operator becomes field-ready.
          </p>
        </div>

        <StatusBanner />
      </header>

      {/* Doctrine — short, sharp */}
      <section className="border-l-2 border-amber/40 pl-4 py-2 space-y-2">
        <div className="text-[10px] text-amber/80 tracking-[0.3em] uppercase font-mono">
          ▸ doctrine
        </div>
        <p className="text-sm leading-relaxed text-text max-w-2xl">
          Most CTFs train one shape of operator. We train four — because real
          campaigns demand them. <span className="text-amber">Predator</span>{" "}
          hunts solo. <span className="text-[#34d8ff]">Ghost</span> works the
          intel cold war. <span className="text-red-400">Clash</span> fights
          rival crews. <span className="text-green">Crew</span> runs the
          full-kill-chain raid. Each arena, the same currency: tradecraft
          earned in Phantom and Specter, spent against thinking adversaries
          under real-time pressure.
        </p>
      </section>

      {/* Dossier stack */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-amber text-lg font-mono tracking-[0.18em] uppercase">
            ▸ operative dossiers
          </h2>
          <span className="text-[10px] text-muted font-mono tracking-[0.18em] uppercase">
            04 of 04 archetypes // 01 incoming
          </span>
        </div>

        {ARCHETYPES.map((a) => (
          <DossierCard key={a.code} a={a} />
        ))}
      </section>

      {/* Skill coverage — honest about what we cover */}
      <section className="space-y-3 border border-border/60 px-5 py-4 bg-amber/[0.01]">
        <h2 className="text-amber text-base font-mono tracking-[0.18em] uppercase">
          ▸ skill coverage
        </h2>
        <p className="text-[13px] leading-relaxed text-text">
          Battles are the PvP application layer — not the curriculum. Deep
          skills are forged in the campaign tracks (Phantom, Specter, future
          tracks). The arenas test what you already carry, under live
          adversarial pressure.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-[11px] font-mono pt-2">
          <div className="text-text">
            <span className="text-green">✓</span> Linux post-ex / privesc
          </div>
          <div className="text-text">
            <span className="text-green">✓</span> OSINT / counterintel
          </div>
          <div className="text-text">
            <span className="text-green">✓</span> Team coordination
          </div>
          <div className="text-text">
            <span className="text-green">✓</span> AI-aware tradecraft
          </div>
          <div className="text-text">
            <span className="text-green">✓</span> Real-time defense
          </div>
          <div className="text-text">
            <span className="text-green">✓</span> Kill-chain ops
          </div>
          <div className="text-muted">
            <span className="text-muted">○</span> Binary exploitation
          </div>
          <div className="text-muted">
            <span className="text-muted">○</span> Cryptanalysis
          </div>
          <div className="text-muted">
            <span className="text-muted">○</span> AD / cloud lateral
          </div>
        </div>
        <p className="text-[11px] text-muted leading-relaxed pt-1">
          Open slots ship as track-gated mode variants — Web-Wars, AD Heist,
          RE Race, Crypto Vault — when their parent tracks deploy.
        </p>
      </section>

      {/* Engage block — final CTA */}
      <section className="border border-amber/40 bg-amber/[0.03] px-5 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="text-[10px] text-amber/80 tracking-[0.3em] uppercase font-mono">
            ▸ first wave
          </div>
          <p className="text-sm text-text leading-relaxed max-w-xl">
            Predator deploys first. Cohort access announced in Discord — join
            to be in the first arena rotation when the gate opens.
          </p>
        </div>
        <a
          href={DISCORD_INVITE_URL}
          rel="noreferrer"
          className="btn-bracket text-amber text-sm font-mono whitespace-nowrap"
        >
          Join First Cohort
        </a>
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
