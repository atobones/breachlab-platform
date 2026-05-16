import Link from "next/link";

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

      <RuleSection title="Exploit paths">
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

      <RuleSection title="Scoring">
        <KV
          rows={[
            ["First crown grab (crown vacant)", "+1"],
            ["Dethrone (crown held by another)", "+5"],
            ["Per minute of hold", "+1 / min"],
            ["Path-attributed patch · Phase 2", "+3"],
          ]}
        />
      </RuleSection>

      <RuleSection title="Round cycle">
        <p className="text-[13px]">
          20 minutes. Auto-reset on cron <code>*/20 UTC</code>. Container
          force-recreated · everything resets. SSH keys persist.
        </p>
      </RuleSection>

      <RuleSection title="Fair play">
        <ul className="space-y-1 list-disc list-inside text-[12px]">
          <li>No attacks on the platform, host, or other tracks.</li>
          <li>No DoS on the arena — fork bombs, OOMs, sshd kills.</li>
          <li>No sharing private keys.</li>
          <li>
            Unintended bugs · arena escape · platform vulns → DM{" "}
            <code>@breachlab</code>. HoF credit (
            <Link href="/hall-of-operatives" className="text-amber">
              /hall-of-operatives
            </Link>
            ).
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

      <RuleSection title="Roadmap">
        <KV
          rows={[
            ["Phase 2", "Escalation · crown >5 min opens new attack path"],
            ["Phase 3", "AI Defender · LLM-driven sysadmin in the box"],
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
