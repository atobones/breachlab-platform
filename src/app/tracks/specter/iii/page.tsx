import Link from "next/link";
import { DISCORD_INVITE_URL } from "@/lib/links";

const BLOCKS = [
  {
    name: "DDoS — Attack & Defence",
    pitch:
      "SYN floods, DNS and NTP amplification, slowloris, layer-7 exhaustion. Then the other side: rate limiting, SYN cookies, CDN-tier mitigation, anycast steering. Both ends of the wire.",
  },
  {
    name: "Firewall & IDS Evasion",
    pitch:
      "Nmap evasion at fingerprint and timing level, WAF bypass through encoding chains, IDS signature evasion, DNS/HTTPS/ICMP tunneling for command-and-control over hostile networks.",
  },
];

export default function SpecterIIIPage() {
  return (
    <div className="space-y-10 max-w-3xl">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-amber text-2xl">
            Specter III — Defence Evasion &amp; Disruption
          </h1>
          <span className="text-xs uppercase tracking-wider px-2 py-0.5 border border-muted text-muted">
            Planned
          </span>
        </div>
        <p className="text-sm text-muted">
          Ten levels. How to slip past the people watching for you — and how
          to disrupt them when slipping past is no longer enough.
        </p>
      </header>

      <section className="space-y-3">
        <p className="text-sm">
          Most training gives you the attack and ignores what defenders do
          about it. Specter III runs both directions: every offensive level
          comes with the defensive countermeasure that stops it, taught well
          enough that you would deploy it in your own infrastructure.
        </p>
        <p className="text-sm">
          The line between disruption and direct action is real and legal —
          we teach where it sits and what crossing it costs. Operatives leave
          this sub-track able to operate against monitored environments and
          to harden environments against operators like themselves.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-amber text-lg">What it covers</h2>
        <ul className="space-y-3 text-sm">
          {BLOCKS.map((b) => (
            <li key={b.name} className="border-l-2 border-border pl-3">
              <strong className="text-amber">{b.name}.</strong>{" "}
              <span className="text-muted">{b.pitch}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 border border-border p-4">
        <h2 className="text-amber text-lg">Status</h2>
        <p className="text-sm">
          Design begins after Specter II ships. The DDoS sub-section depends
          on isolated network-namespace orchestration we will architect with
          Specter II infrastructure.
        </p>
      </section>

      <footer className="border-t border-border pt-4 space-y-2">
        <p className="text-sm">
          <a
            href={DISCORD_INVITE_URL}
            className="text-amber hover:underline"
            rel="noreferrer"
          >
            Join the Discord
          </a>{" "}
          for ship-date announcements.
        </p>
        <p className="text-xs text-muted">
          <Link href="/tracks/specter" className="text-amber hover:underline">
            ← Back to Specter overview
          </Link>
        </p>
      </footer>
    </div>
  );
}
