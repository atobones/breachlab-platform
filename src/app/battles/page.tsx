import Link from "next/link";
import { DISCORD_INVITE_URL } from "@/lib/links";

export const metadata = {
  title: "Battles — BreachLab",
  description:
    "Three competitive PvP modes coming to BreachLab: Async Red vs Blue, King of the Hill, and Live Attack-Defense.",
};

const FORMATS = [
  {
    key: "async",
    phase: "Phase 1 · MVP",
    accent: "amber",
    title: "Async Red vs Blue",
    tagline: "Plant persistence → hunt persistence.",
    mode: "async · drop-in · solo or paired",
    body: [
      "Red gets root on a fresh box for 30 min and plants persistence: cron, systemd units, SUID backdoors, LD_PRELOAD, authorized_keys, kernel modules.",
      "Blue inherits the same box post-Red and has 30 min to find and remove every artefact. Symmetric scoring — each side scores against the other's misses.",
      "Optional ghost mode: play Blue against a recorded Red (or play Red against an instructor's Blue baseline). No matchmaking required.",
    ],
    pros: [
      "low ops cost — fits one VPS",
      "symmetric: every player gets both sides",
      "trains incident-response triage under time pressure",
    ],
  },
  {
    key: "koth",
    phase: "Phase 2",
    accent: "red",
    title: "King of the Hill",
    tagline: "Get root. Hold it. Score per minute.",
    mode: "sync · drop-in · 30-min rounds",
    body: [
      "One shared container. Everyone SSHes in as a different user. The first to root scores +1 per minute they keep the crown.",
      "Other players kick you off — kill your processes, change root password, rotate SSH keys, patch the hole you came through.",
      "Reuses Phantom SUID + Redis privesc paths — known territory, hostile neighbours.",
    ],
    pros: [
      "stream-friendly — visible kills, live counter",
      "drop-in / drop-out — no lobby",
      "one container per round — cheap to host",
    ],
  },
  {
    key: "ad",
    phase: "Phase 3",
    accent: "blue",
    title: "Live Attack-Defense",
    tagline: "Patch your infra while breaking theirs.",
    mode: "sync · scheduled · team vs team",
    body: [
      "DEF CON CTF / CCDC format. Each team gets an identical vulnerable stack — web app, database, auth service.",
      "Simultaneously: defend yours (patch, monitor, IR) and attack theirs (capture flags from their copy). Flags rotate every few minutes so persistent C2 is rewarded.",
      "Bonus points for service uptime — break too much of your own infra and you bleed score.",
    ],
    pros: [
      "real full-stack combat — offence + defence + IR",
      "flagship event format — wow factor for tournaments",
      "every operator gets sharpened on both sides",
    ],
  },
];

const ACCENT_BORDER: Record<string, string> = {
  amber: "border-amber/40 bg-amber/5",
  red: "border-red-400/40 bg-red-400/5",
  blue: "border-blue-400/40 bg-blue-400/5",
};
const ACCENT_TITLE: Record<string, string> = {
  amber: "text-amber",
  red: "text-red-400",
  blue: "text-blue-400",
};
const ACCENT_PHASE: Record<string, string> = {
  amber: "border-amber/50 text-amber/80",
  red: "border-red-400/50 text-red-400/80",
  blue: "border-blue-400/50 text-blue-400/80",
};

export default function BattlesPage() {
  return (
    <article className="space-y-10 max-w-3xl" data-testid="battles-page">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-amber text-3xl phosphor wordmark">
            <span className="glitch" data-text="Battles">Battles</span>
          </h1>
          <span className="text-[10px] text-amber/80 border border-amber/40 px-1.5 py-0.5 rounded uppercase tracking-wider">
            in development
          </span>
        </div>
        <p className="text-sm text-muted">
          Three competitive PvP modes — async, drop-in sync, and scheduled
          team battles.
        </p>
      </header>

      <section className="space-y-4">
        {FORMATS.map((f) => (
          <div
            key={f.key}
            className={`border ${ACCENT_BORDER[f.accent]} p-5 space-y-3`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div
                  className={`${ACCENT_TITLE[f.accent]} font-mono text-lg font-bold uppercase tracking-wider`}
                >
                  ▸ {f.title}
                </div>
                <div className="text-muted text-xs italic mt-0.5">
                  {f.tagline}
                </div>
              </div>
              <span
                className={`text-[10px] border ${ACCENT_PHASE[f.accent]} px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap`}
              >
                {f.phase}
              </span>
            </div>
            <div className="text-[10px] text-muted uppercase tracking-widest font-mono">
              {f.mode}
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-text">
              {f.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <ul className="text-xs text-muted list-none space-y-1 pt-1">
              {f.pros.map((p, i) => (
                <li key={i}>
                  <span className={ACCENT_TITLE[f.accent]}>+</span> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-text">
        <h2 className="text-amber text-lg font-mono">▸ Why three formats</h2>
        <p>
          Most CTFs train you for one side. Real incidents need both — the
          same operator who plants a foothold on a red engagement triages
          it on a blue shift the next morning. Each Battle format
          stress-tests a different muscle: forensics under pressure, live
          combat reflexes, or full-stack team coordination.
        </p>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-text">
        <h2 className="text-amber text-lg font-mono">▸ Roadmap</h2>
        <ol className="space-y-2 text-sm list-decimal list-inside text-muted">
          <li>
            <span className="text-amber">Async Red vs Blue</span> — first
            cohort, lowest infra cost, ships first.
          </li>
          <li>
            <span className="text-red-400">King of the Hill</span> — once
            community traction is there. Friday-night live tournaments.
          </li>
          <li>
            <span className="text-blue-400">Live Attack-Defense</span> —
            after multi-host scaling. Flagship scheduled events.
          </li>
        </ol>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-text">
        <h2 className="text-amber text-lg font-mono">▸ When</h2>
        <p>
          Working on it. The chain track + ephemerals had to ship first.
          We&apos;ll announce the first round in{" "}
          <a
            href={DISCORD_INVITE_URL}
            className="text-amber underline"
            rel="noreferrer"
          >
            Discord
          </a>{" "}
          — join if you want to be in the first cohort.
        </p>
      </section>

      <footer className="pt-4 border-t border-border/40 text-xs text-muted">
        <Link href="/" className="hover:text-amber">
          ← back to lab
        </Link>
      </footer>
    </article>
  );
}
