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
      {/* Hero */}
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

      <RuleSection title="Loop">
        <ol className="space-y-0.5 list-decimal list-inside font-mono text-[12px]">
          <li>Register SSH key → get slot <span className="text-amber">kothN</span></li>
          <li><code>ssh -i your_key -p 2300 kothN@204.168.229.209</code></li>
          <li>Get root via one of the paths below</li>
          <li><code>crown-claim kothN &lt;path&gt;</code></li>
          <li>Hold the crown · <span className="text-amber">+1 / min</span></li>
          <li>Get dethroned · take it back</li>
        </ol>
      </RuleSection>

      <RuleSection title="Core paths (always open)">
        <KV
          rows={[
            ["L7  phantom-python3 SUID", "argv code injection"],
            ["L8  system-checker SUID", "shell metachar injection"],
            ["L17 Redis CONFIG SET", "write /root/.ssh/authorized_keys"],
          ]}
        />
        <p className="text-[11px] text-muted pt-2 leading-snug">
          Concrete one-liners are in the <em>exploit cheat sheet</em> on the
          arena page (visible once you&apos;re enlisted).
        </p>
      </RuleSection>

      <RuleSection title="Escalation">
        <p className="text-[13px] leading-relaxed">
          Hold the crown long enough and the box mutates against you.
          After <strong>five minutes on the throne</strong>, the arena
          picks a fresh attack path from its library and gives you a
          sixty-second warning before it opens. Up to three new paths
          can land in a single round, spaced about three minutes apart.
        </p>
        <p className="text-[13px] leading-relaxed pt-1">
          Other operators get a clean shot at dethroning you through an
          exploit you&apos;ve never seen before. Watch the{" "}
          <em>exploit market</em> on the arena — when a new slug appears
          (<code>writable-passwd</code>, <code>python-cap-setuid</code>,
          and friends), the clock on your reign just got shorter.
        </p>
      </RuleSection>

      <RuleSection title="The exploit market">
        <p className="text-[13px] leading-relaxed">
          Every path is priced. It starts the round at its base value —
          usually twelve points for the always-open core, up to eighteen
          for the bigger escalations. Every time someone grabs the crown
          through a path, that path&apos;s price drops by two, floored at
          two. A crowded path is a cheap path; the operator who finds
          the underused one cashes in the bigger ticket.
        </p>
        <p className="text-[13px] leading-relaxed pt-1">
          The price is captured at the moment of the grab, so your
          payout is locked in even if the market shifts a second later.
          Prices reset when the round closes.
        </p>
      </RuleSection>

      <RuleSection title="Scoring">
        <KV
          rows={[
            ["Crown grab via a known path", "+ value at exploit time"],
            ["Per minute of hold", "+1 / min"],
            ["Generic patch", "+3"],
            ["Path-attributed patch (close the path you got hit with)", "+5"],
            ["First crown via an unknown path (not yet in the catalog)", "+50, once per slug"],
          ]}
        />
        <p className="text-[12px] text-muted pt-2 leading-snug">
          Unintended privesc paths are part of the game. If you find one
          not in the path catalog, <code>crown-claim &lt;slot&gt; &lt;any-name&gt;</code>
          {" "}still works — the +50 first-discoverer bonus lands when the
          path gets added. DM the technique to @ato to seed the catalog.
        </p>
      </RuleSection>

      <RuleSection title="Round cycle">
        <p className="text-[13px]">
          The 30-minute clock starts when the <strong>first crown</strong>
          {" "}is grabbed in the round — not when the arena opens. While
          no one has taken the crown, the arena is <em>standing by</em>{" "}
          and you can ssh in, look around, prep, all without burning
          round time. The first crown grab kicks the timer off.
        </p>
        <p className="text-[13px] pt-1">
          Thirty minutes after that grab, the round closes: container
          force-recreated, every path resets, escalations deactivate,
          prices back to base. SSH keys persist across rounds — you
          don&apos;t re-register.
        </p>
      </RuleSection>

      <RuleSection title="Fair play">
        <p className="text-[13px] leading-relaxed">
          The line is simple: do anything to the box, do nothing to
          deny the box. Hardening it, patching it, killing attackers
          mid-exploit, trapping it — that&apos;s the game. Locking
          everyone else out so you alone can sit on the throne is not.
        </p>

        <p className="text-[11px] font-mono tracking-[0.18em] uppercase pt-2 text-emerald-400/80">
          ✓ Allowed — these are how you defend
        </p>
        <ul className="space-y-0.5 list-disc list-inside text-[12px] text-text">
          <li>Patch the path you got hit with (chmod -s SUIDs, edit configs, kill services)</li>
          <li>Kill another operator&apos;s exploit process mid-run (specific PIDs)</li>
          <li>Booby-trap files attackers might run (decoys in /tmp, tampered wrappers)</li>
          <li>Modify your own home, run anything as root that doesn&apos;t brick the box</li>
          <li>Read auth.log, ps, w — track competitors</li>
        </ul>

        <p className="text-[11px] font-mono tracking-[0.18em] uppercase pt-3 text-red-400/80">
          ✗ Not allowed — anti-game patterns
        </p>
        <p className="text-[12px] leading-snug text-muted pb-1">
          A watchdog catches these. First hit = round forfeit + SSH key
          locked for 24 hours.
        </p>
        <ul className="space-y-0.5 list-disc list-inside text-[12px] text-text">
          <li>Killing other operators&apos; login shells on sight (kill-on-login loops)</li>
          <li>Fork bombs · OOM bombs · disk fill</li>
          <li>Killing sshd · blocking SSH via iptables</li>
          <li>Bricking critical files (chmod 000 /bin/bash, /etc/passwd, etc.)</li>
        </ul>

        <p className="text-[11px] font-mono tracking-[0.18em] uppercase pt-3 text-muted">
          ─ Other rules
        </p>
        <ul className="space-y-0.5 list-disc list-inside text-[12px]">
          <li>No attacks on the platform, host, or other tracks.</li>
          <li>No sharing private keys.</li>
          <li>
            Unintended bugs · arena escape · platform vulns → DM{" "}
            <a
              href={DISCORD_INVITE_URL}
              rel="noreferrer"
              className="text-amber"
            >
              @ato in Discord
            </a>
            .
          </li>
        </ul>
      </RuleSection>

      <RuleSection title="Command reference">
        <KV
          rows={[
            ["crown-claim <slot> <path>", "claim throne · run as root"],
            ["stat /root/.crown", "current king (owner field)"],
            ["cat /var/log/auth.log", "watch other ops"],
            ["w  ·  ps auxf", "who else is on the box"],
          ]}
        />
      </RuleSection>

      <RuleSection title="What&apos;s coming">
        <ul className="space-y-1 list-disc list-inside text-[13px] leading-relaxed">
          <li>
            <strong>Per-round slot rotation</strong> — slots release on
            round close so new operators always have a way in.
          </li>
          <li>
            <strong>AI defender</strong> — an LLM running as the box&apos;s
            sysadmin, reading syslog in real time and patching paths
            while you&apos;re still inside.
          </li>
          <li>
            <strong>Season ladder</strong> — four-week ranked windows
            with a top-eight finals bracket and side-by-side spectator
            streams.
          </li>
          <li>
            <strong>Dethrone replay</strong> — shell-history capture so
            the loser can read the attacker&apos;s exact keystrokes and
            close the path for next time.
          </li>
        </ul>
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
