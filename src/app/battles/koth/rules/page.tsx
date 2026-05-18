import Link from "next/link";
import { DISCORD_INVITE_URL } from "@/lib/links";

export const metadata = {
  title: "Crown Wars · Rules — BreachLab",
};

type Row = [string, string];

function RuleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-amber text-[11px] font-mono tracking-[0.3em] uppercase">
        ─ {title}
      </h2>
      <div className="text-[13px] leading-relaxed text-text">{children}</div>
    </section>
  );
}

function KV({ rows }: { rows: Row[] }) {
  return (
    <table className="text-[12px] font-mono w-full tabular-nums">
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={i} className="border-b border-border/30 last:border-b-0">
            <td className="py-1 pr-4 text-text whitespace-nowrap">{k}</td>
            <td className="py-1 text-muted text-right">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function KothRulesPage() {
  return (
    <article className="space-y-7 max-w-2xl" data-testid="koth-rules-page">
      <header className="space-y-2">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono">
            ▸ predator arena · rules
          </div>
          <Link
            href="/battles/koth"
            className="btn-bracket text-amber text-[10px] font-mono tracking-[0.18em]"
          >
            ← Arena
          </Link>
        </div>
        <h1 className="text-amber text-2xl sm:text-3xl phosphor wordmark font-bold tracking-[0.08em]">
          CROWN WARS
        </h1>
        <p className="text-[13px] text-muted">
          Take root. Claim the crown. Hold it.
        </p>
      </header>

      <RuleSection title="The loop">
        <ol className="space-y-0.5 list-decimal list-inside font-mono text-[12px]">
          <li>Register SSH key, claim a slot</li>
          <li><code>ssh -i your_key -p 2300 kothN@204.168.229.209</code></li>
          <li>Get root via any primitive below</li>
          <li><code>crown-claim kothN &lt;primitive-slug&gt;</code></li>
          <li>Hold the throne · <span className="text-amber">+1/min</span> while active</li>
          <li>Get dethroned · take it back</li>
        </ol>
      </RuleSection>

      <RuleSection title="Primitives">
        <p className="text-[11px] text-muted mb-2">
          Slugs you pass to <code>crown-claim</code>. Exploit one-liners
          live in the in-arena cheat sheet.
        </p>
        <div className="text-[10px] text-amber/80 font-mono tracking-widest uppercase mt-1 mb-1">
          ─ core (always open)
        </div>
        <KV
          rows={[
            ["suid-python-wrapper", "argv code injection"],
            ["suid-shell-injection", "shell metachar injection"],
            ["redis-config-set-dir", "write /root/.ssh/authorized_keys"],
          ]}
        />
        <div className="text-[10px] text-amber/80 font-mono tracking-widest uppercase mt-3 mb-1">
          ─ escalation (unlock during the round)
        </div>
        <KV
          rows={[
            ["writable-ld-preload", "constructor as root"],
            ["writable-passwd", "world-writable /etc/passwd"],
            ["python-cap-setuid", "capability-bound setuid"],
            ["sudo-busybox-nopasswd", "sudo busybox NOPASSWD"],
            ["wrapper-cron-injection", "cron-driven wrapper"],
            ["writable-pythonpath", "import-hook hijack"],
            ["group-writable-cron-d", "write into /etc/cron.d"],
            ["writable-init-script", "modify init.d job"],
            ["suid-wrapper-tmp-script", "SUID → /tmp script"],
            ["suid-wrapper-userland", "SUID → userland script"],
            ["leaked-root-creds", "credential leak"],
          ]}
        />
      </RuleSection>

      <RuleSection title="Scoring">
        <KV
          rows={[
            ["Crown via known primitive", "+ market value at grab time"],
            ["Hold the throne", "+1 / min (active only)"],
            ["Generic patch", "+3"],
            ["Patch the path you got hit with", "+5"],
            ["First crown via a new slug", "+50 (once per slug, global)"],
          ]}
        />
        <p className="text-[11px] text-muted pt-2 leading-snug">
          Market: every primitive starts the round at its base value (10–18).
          Each grab via a path drops its price by 2 (floor: 2). Price is
          locked at grab time. Resets on round close.
        </p>
      </RuleSection>

      <RuleSection title="Crown decay">
        <p>
          After <strong>5 min</strong> on the throne, your score starts
          bleeding <strong>30% per minute</strong>. Patch the path you got
          hit with (+5) to reset the timer. Or pray the Guard heals you.
        </p>
      </RuleSection>

      <RuleSection title="Escalation">
        <p>
          After 5 min of an active king, the arena opens a fresh escalation
          primitive (60s warning). Up to 3 per round, ~3 min apart. Watch
          the <em>exploit market</em> on the arena page — new slug = the
          king&apos;s reign just got shorter.
        </p>
      </RuleSection>

      <RuleSection title="King's Guard · asymmetric defender">
        <p className="pb-2">
          Pure browser play, no SSH needed. <strong>One slot per round</strong>,
          first-come-first-served, opens only <strong>after the first crown
          grab</strong>. Sits with the king against attackers.
        </p>
        <KV
          rows={[
            ["🔒 lockdown · 1/round", "freeze a primitive 3min — no crowns score"],
            ["👁 eye · always on", "live syscall feed across all slots"],
            ["💚 heal · 1/round", "reset king's decay → 5min grace"],
            ["passive scoring", "½ king's active hold-seconds / min"],
          ]}
        />
      </RuleSection>

      <RuleSection title="Drift mode (mutating arena)">
        <p>
          SUID binaries get renamed AND relocated every round.
          <code>phantom-python3</code> might land at{" "}
          <code>/opt/svc/bin/ops-py3</code> one round,
          <code>/srv/local/sbin/py-runtime</code> the next. Same primitive,
          same exploit chain — different path. Memorize the chain, not the
          path. Enumerate with <code>find / -perm -4000</code>.
        </p>
        <p className="pt-2">
          Each round also plants a <strong>decoy SUID binary</strong> at{" "}
          <code>/usr/local/bin/</code>. Looks exploitable; isn&apos;t.
          Touching it logs your uid and argv to a file the Guard&apos;s Eye
          reads — naive attackers get burned. Smart players{" "}
          <code>strings</code> a binary before exploiting it.
        </p>
      </RuleSection>

      <RuleSection title="Live audit feed">
        <p>
          Every syscall the king makes streams live to{" "}
          <Link href="/battles/koth" className="text-amber">/battles/koth</Link>.
          Captured outside the arena via host-namespace strace —
          king-as-root cannot disable it. You ARE being watched while
          you sit on the throne.
        </p>
      </RuleSection>

      <RuleSection title="Round cycle">
        <p>
          30-minute clock starts on the <strong>first crown grab</strong>,
          not when the arena opens. Until then: <em>standing by</em>, you can
          ssh in, look around, prep. After close: container force-recreated,
          primitives reset, prices reset, drift reshuffles. SSH keys persist.
        </p>
      </RuleSection>

      <RuleSection title="Daily challenge">
        <p>
          One primitive a day, same configuration for every player worldwide.
          Shared leaderboard. Resets 00:00 UTC. Twist mode rotates daily —
          encoded slug, riddle, or plain. See{" "}
          <Link href="/battles/koth/daily" className="text-amber">/battles/koth/daily</Link>.
        </p>
      </RuleSection>

      <RuleSection title="Ghost replay">
        <p>
          Every session is recorded as an asciinema cast. Watch any
          past kill at{" "}
          <Link href="/battles/koth/replays" className="text-amber">
            /battles/koth/replays
          </Link>
          . Race the ghost: your timer ticks against the past king&apos;s
          playback in real-time. Beat their time to land on the
          replay&apos;s leaderboard.
        </p>
      </RuleSection>

      <RuleSection title="Fair play">
        <p className="pb-2">
          Do anything to the box. Do nothing to deny the box. Hardening,
          patching, killing attackers mid-exploit, booby-trapping — game.
          Locking everyone out so you alone sit on the throne — not.
        </p>

        <p className="text-[11px] font-mono tracking-[0.18em] uppercase pt-1 text-emerald-400/80">
          ✓ allowed
        </p>
        <ul className="space-y-0.5 list-disc list-inside text-[12px] text-text">
          <li>Patch the path you got hit with</li>
          <li>Kill specific exploit PIDs mid-run</li>
          <li>Booby-trap files attackers might run</li>
          <li>Read auth.log, ps, w</li>
        </ul>

        <p className="text-[11px] font-mono tracking-[0.18em] uppercase pt-3 text-red-400/80">
          ✗ not allowed · watchdog enforced
        </p>
        <ul className="space-y-0.5 list-disc list-inside text-[12px] text-text">
          <li>Kill-on-login loops · killing other ops&apos; shells on sight</li>
          <li>Fork bombs · OOM bombs · disk fill</li>
          <li>Killing sshd · iptables-blocking SSH</li>
          <li>Bricking critical files (chmod 000 /bin/bash, /etc/passwd…)</li>
        </ul>
        <p className="text-[11px] text-muted pt-1 leading-snug">
          Trigger = round forfeit + force-recreate. Repeat = manual ban.
        </p>

        <p className="text-[11px] font-mono tracking-[0.18em] uppercase pt-3 text-muted">
          ─ other
        </p>
        <ul className="space-y-0.5 list-disc list-inside text-[12px]">
          <li>No attacks on platform, host, or other tracks</li>
          <li>No sharing private keys</li>
          <li>
            Arena escape · platform vulns → DM{" "}
            <a
              href={DISCORD_INVITE_URL}
              rel="noreferrer"
              className="text-amber"
            >
              @ato in Discord
            </a>
          </li>
        </ul>
      </RuleSection>

      <RuleSection title="Command reference">
        <KV
          rows={[
            ["crown-claim <slot> <slug>", "claim throne (run as root)"],
            ["find / -perm -4000", "enumerate SUID binaries (drift)"],
            ["stat /root/.crown", "current king (owner field)"],
            ["cat /var/log/auth.log", "watch other ops"],
            ["w · ps auxf", "who else is on the box"],
          ]}
        />
      </RuleSection>

      <footer className="pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted font-mono">
        <Link
          href="/battles/koth"
          className="hover:text-amber tracking-[0.18em] uppercase"
        >
          ← arena
        </Link>
        <Link
          href="/battles/koth/history"
          className="hover:text-amber tracking-[0.18em] uppercase"
        >
          history →
        </Link>
      </footer>
    </article>
  );
}
