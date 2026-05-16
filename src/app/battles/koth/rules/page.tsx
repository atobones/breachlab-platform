import Link from "next/link";

export const metadata = {
  title: "Crown Wars · Rules — BreachLab",
};

export default function KothRulesPage() {
  return (
    <article className="space-y-6 max-w-3xl" data-testid="koth-rules-page">
      {/* Hero */}
      <header className="space-y-2">
        <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono">
          ▸ predator arena · rules
        </div>
        <h1 className="text-amber text-2xl sm:text-3xl phosphor wordmark font-bold tracking-[0.08em]">
          CROWN WARS
        </h1>
        <p className="text-[13px] text-muted leading-relaxed max-w-2xl">
          Take root. Claim the crown. Hold it. The box mutates against
          playbooks — playbooks die against thinking opponents.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-amber text-base font-mono tracking-[0.18em] uppercase">
          ▸ Loop
        </h2>
        <ol className="text-[13px] text-text space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>
            Register your SSH pubkey at{" "}
            <Link href="/battles/koth" className="text-amber">
              /battles/koth
            </Link>
            . You get a permanent slot{" "}
            <code>kothN</code> (0..4 — five operatives per arena).
          </li>
          <li>
            SSH into the arena:{" "}
            <code>ssh -i ~/.ssh/your_key -p 2300 kothN@204.168.229.209</code>
          </li>
          <li>
            Get root via any of the three exploit paths (see <em>Exploit
            paths</em> below). The arena container is intentionally
            vulnerable — that&apos;s the game.
          </li>
          <li>
            Run <code>crown-claim kothN &lt;exploit-path&gt;</code> as root.
            This writes <code>/root/.crown</code> with your slot as
            owner.
          </li>
          <li>
            The crown daemon polls every 3 seconds, detects the ownership
            change, and POSTs the event to the platform. You appear on{" "}
            <Link href="/battles/koth" className="text-amber">
              /battles/koth
            </Link>{" "}
            as the current king.
          </li>
          <li>
            Hold the crown. Every minute you hold = +1 point. Get
            dethroned and the next claimer earns +5 and the timer
            resets.
          </li>
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-amber text-base font-mono tracking-[0.18em] uppercase">
          ▸ Exploit paths (Phase 1)
        </h2>
        <p className="text-[12px] text-muted leading-snug">
          Three open paths to root. Detailed one-liners are in the{" "}
          <em>exploit cheat sheet</em> on the main arena page (visible
          once you&apos;re enlisted).
        </p>
        <ul className="text-[13px] text-text space-y-1.5 list-disc list-inside leading-relaxed">
          <li>
            <span className="text-amber">L7 — phantom-python3 SUID</span>{" "}
            (argv code injection / PYTHONSTARTUP).
          </li>
          <li>
            <span className="text-amber">L8 — system-checker SUID</span>{" "}
            (shell metachar injection).
          </li>
          <li>
            <span className="text-amber">L17 — Redis privesc</span>{" "}
            (CONFIG SET → /root/.ssh/authorized_keys).
          </li>
        </ul>
        <p className="text-[11px] text-muted leading-snug">
          Phase 2 ships an escalation engine — when a crown is held
          longer than 5 minutes, a new attack-surface path opens
          dynamically. Phase 3 ships the AI Defender — an LLM-driven
          sysadmin that patches paths in real time and rotates keys.
          Memorize the playbook, get burned by it.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-amber text-base font-mono tracking-[0.18em] uppercase">
          ▸ Scoring
        </h2>
        <table className="text-[12px] font-mono w-full">
          <tbody>
            <tr className="border-b border-border/40">
              <td className="py-1 text-text">First crown grab (crown was vacant)</td>
              <td className="py-1 text-amber tabular-nums text-right">+1</td>
            </tr>
            <tr className="border-b border-border/40">
              <td className="py-1 text-text">Dethrone (crown was held by another op)</td>
              <td className="py-1 text-amber tabular-nums text-right">+5</td>
            </tr>
            <tr className="border-b border-border/40">
              <td className="py-1 text-text">Per minute of crown hold (rounded down)</td>
              <td className="py-1 text-amber tabular-nums text-right">+1 / min</td>
            </tr>
            <tr>
              <td className="py-1 text-text">
                Path-attributed patch (close path you got hit with) ·{" "}
                <span className="text-muted">Phase 2</span>
              </td>
              <td className="py-1 text-amber tabular-nums text-right">+3</td>
            </tr>
          </tbody>
        </table>
        <p className="text-[11px] text-muted leading-snug">
          Scoring resets at the start of each round. Permanent records
          (badges, lifetime stats) ship in a later phase.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-amber text-base font-mono tracking-[0.18em] uppercase">
          ▸ Round cycle
        </h2>
        <ul className="text-[13px] text-text space-y-1.5 list-disc list-inside leading-relaxed">
          <li>
            Rounds last <strong>20 minutes</strong>. At reset, the arena
            container is force-recreated — all state resets (crown
            vacant, processes gone, files restored, root password
            randomized).
          </li>
          <li>
            Reset is on a <strong>cron schedule</strong> ({" "}
            <code>*/20 * * * *</code> UTC). No warning shown — your
            crown can disappear mid-fight.
          </li>
          <li>
            Per-player SSH keys persist across rounds. You don&apos;t
            re-register after a reset.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-amber text-base font-mono tracking-[0.18em] uppercase">
          ▸ Tutorial badge
        </h2>
        <p className="text-[13px] text-text leading-relaxed">
          Your first crown_taken event flips you from{" "}
          <span className="border border-muted/60 text-muted bg-bg px-1 font-mono text-[11px]">
            rookie
          </span>{" "}
          to{" "}
          <span className="border border-amber/60 text-amber bg-amber/5 px-1 font-mono text-[11px]">
            veteran
          </span>
          . No scoring penalty for being a rookie — the badge is just
          recognition that you&apos;ve cleared the entry-level loop.
          (Real tutorial round vs AI bot ships in Phase 2.)
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-amber text-base font-mono tracking-[0.18em] uppercase">
          ▸ Fair play
        </h2>
        <ul className="text-[13px] text-text space-y-1.5 list-disc list-inside leading-relaxed">
          <li>
            <strong>Don&apos;t attack the platform.</strong> The arena
            container is the target. <code>breachlab.org</code>, the
            host VPS, the database, other tracks (Ghost / Phantom /
            Specter) — all out of scope.
          </li>
          <li>
            <strong>Don&apos;t deny service to other operators.</strong>{" "}
            Fork bombs, OOM crashes, kernel panics, sshd kills — they
            ruin the round for everyone. Get root, hold the crown,
            mess with rivals via your own tradecraft.
          </li>
          <li>
            <strong>Don&apos;t share your SSH private key.</strong>{" "}
            Slots are permanent and tied to your account. If your key
            leaks, contact <code>@breachlab</code> for rotation.
          </li>
          <li>
            <strong>Stream / writeup at your own pace.</strong> The
            paths are intentional public knowledge; the skill is
            execution under contested root. Phase 2+ mutation will
            invalidate static playbooks anyway.
          </li>
          <li>
            <strong>Unintended bugs / arena escapes / platform
            vulns</strong> get full bug-bounty treatment — report
            privately to <code>@breachlab</code>, claim HoF credit
            (see <Link href="/hall-of-operatives" className="text-amber">/hall-of-operatives</Link>).
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-amber text-base font-mono tracking-[0.18em] uppercase">
          ▸ Command reference
        </h2>
        <table className="text-[12px] font-mono w-full">
          <tbody>
            <tr className="border-b border-border/40">
              <td className="py-1 text-amber">crown-claim &lt;slot&gt; &lt;path&gt;</td>
              <td className="py-1 text-text">claim throne — run as root after privesc</td>
            </tr>
            <tr className="border-b border-border/40">
              <td className="py-1 text-amber">stat /root/.crown</td>
              <td className="py-1 text-text">see current king (owner field)</td>
            </tr>
            <tr className="border-b border-border/40">
              <td className="py-1 text-amber">cat /var/log/auth.log</td>
              <td className="py-1 text-text">watch what other operators are doing</td>
            </tr>
            <tr>
              <td className="py-1 text-amber">w / ps auxf</td>
              <td className="py-1 text-text">see who else is logged in / running</td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted font-mono">
        <Link href="/battles/koth" className="hover:text-amber tracking-[0.18em] uppercase">
          ← arena
        </Link>
        <span className="tracking-[0.18em] uppercase">predator · phase 1</span>
      </footer>
    </article>
  );
}
