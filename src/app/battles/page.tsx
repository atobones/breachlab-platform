import Link from "next/link";
import { DISCORD_INVITE_URL } from "@/lib/links";

export const metadata = {
  title: "Battles — BreachLab",
  description:
    "Red vs Blue competitive mode coming to BreachLab. Plant persistence, hunt it down.",
};

export default function BattlesPage() {
  return (
    <article className="space-y-10 max-w-2xl" data-testid="battles-page">
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
          Red vs Blue · async round-based · player-vs-player.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 text-sm">
        <div className="border border-red-400/40 bg-red-400/5 p-4 space-y-2">
          <div className="text-red-400 font-mono font-bold uppercase tracking-wider">
            ▸ Red
          </div>
          <div className="text-muted text-xs leading-relaxed">
            You get root on a fresh box for 30 minutes. Plant as many
            persistence mechanisms as you can: cron, systemd units, SUID
            backdoors, <code>LD_PRELOAD</code>, authorized_keys, kernel
            modules. Hide them well.
          </div>
          <div className="text-red-400/80 text-xs pt-1">
            +1 point per artefact Blue fails to find.
          </div>
        </div>
        <div className="border border-blue-400/40 bg-blue-400/5 p-4 space-y-2">
          <div className="text-blue-400 font-mono font-bold uppercase tracking-wider">
            ▸ Blue
          </div>
          <div className="text-muted text-xs leading-relaxed">
            You get the same box, post-Red. 30 minutes to find and remove
            every backdoor. Forensics, baseline diffs, log analysis,{" "}
            <code>find -newer</code>. Triage under time pressure.
          </div>
          <div className="text-blue-400/80 text-xs pt-1">
            +1 point per artefact found and removed.
          </div>
        </div>
      </section>

      <section className="space-y-3 text-sm leading-relaxed text-text">
        <h2 className="text-amber text-lg font-mono">▸ Why this exists</h2>
        <p>
          Most CTFs train you for one side. Real incidents need both — the
          same operator who plants a foothold on a red engagement is the
          one who triages it on a blue shift the next morning.
        </p>
        <p>
          BreachLab Battles is the same shared box, two roles, scored
          symmetrically. No teams, no scheduled tournaments, no lobby —
          drop in when you want, get matched against whoever&apos;s queued.
        </p>
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
