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

      <RuleSection title="Escalation (Phase 2 · live)">
        <ul className="space-y-1 list-disc list-inside text-[12px]">
          <li>
            King holds the crown <strong>5 min</strong> → arena picks a
            random path from the escalation library, broadcasts a
            warning.
          </li>
          <li>
            <strong>60s later</strong> the path activates. Fresh attack
            surface against the current king.
          </li>
          <li>
            Up to <strong>3 escalation paths</strong> per round · 3-min
            cooldown between them.
          </li>
          <li>
            Path slugs visible in the <em>exploit market</em> HUD on the
            arena (e.g. <code>writable-passwd</code>,{" "}
            <code>python-cap-setuid</code>).
          </li>
        </ul>
      </RuleSection>

      <RuleSection title="Diamond pricing">
        <ul className="space-y-1 list-disc list-inside text-[12px]">
          <li>
            Each path starts the round at its <strong>base value</strong>
            {" "}(usually 12 pt; some escalation paths up to 18 pt).
          </li>
          <li>
            Every crown grab through the path drops its value by{" "}
            <strong>2 pt</strong>, floored at <strong>2 pt</strong>.
          </li>
          <li>
            A crowded path is a cheap path. Find an underused one.
          </li>
          <li>
            Prices captured at exploit-time on each event. Reset on
            round close.
          </li>
        </ul>
      </RuleSection>

      <RuleSection title="Scoring">
        <KV
          rows={[
            ["Crown grab via a path", "+ value at exploit time"],
            ["Per minute of hold", "+1 / min"],
            ["Generic patch", "+3"],
            ["Path-attributed patch (close the path you got hit with)", "+5"],
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
            <a
              href={DISCORD_INVITE_URL}
              rel="noreferrer"
              className="text-amber"
            >
              @ato in Discord
            </a>
            . HoF credit (
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
            ["Phase 2 · live", "Escalation engine + Diamond pricing"],
            ["Phase 3", "AI Defender · LLM-driven sysadmin in the box"],
            ["Phase 4", "Season mode + spectator stream + session replay"],
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
