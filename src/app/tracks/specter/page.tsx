import Link from "next/link";
import { DISCORD_INVITE_URL } from "@/lib/links";

type SubTrackCard = {
  slug: string;
  numeral: string;
  title: string;
  status: "LIVE" | "SOON" | "PLANNED";
  levels: string;
  pitch: string;
};

const SUBTRACKS: SubTrackCard[] = [
  {
    slug: "specter/i",
    numeral: "I",
    title: "OSINT — Recon Operatives",
    status: "LIVE",
    levels: "14 levels",
    pitch:
      "Passive intelligence gathering at professional grade. Multi-engine pivots, source independence, OPSEC discipline, adversarial targets. The only OSINT track that grades operational tradecraft alongside collection.",
  },
  {
    slug: "specter/ii",
    numeral: "II",
    title: "Network & Wireless",
    status: "PLANNED",
    levels: "8 levels",
    pitch:
      "Initial access through the wire and the air. ARP spoofing, LLMNR/NBT-NS, MITM extraction, network pivoting, WPA2 cracking, evil twin APs, WPA Enterprise downgrade.",
  },
  {
    slug: "specter/iii",
    numeral: "III",
    title: "Defence Evasion & Disruption",
    status: "PLANNED",
    levels: "10 levels",
    pitch:
      "Both sides of the line. DDoS attack and defence, firewall bypass, IDS signature evasion, DNS/HTTPS/ICMP tunneling.",
  },
];

export default function SpecterOverviewPage() {
  return (
    <div className="space-y-10 max-w-3xl">
      <header className="space-y-3">
        <h1 className="text-amber text-2xl">Specter</h1>
        <p className="text-sm text-muted">
          Recon &amp; Initial Access. Three sub-tracks, ~32 levels, ephemeral
          per-session containers from day one. Specter I is live; II and III
          ship next.
        </p>
      </header>

      <section className="space-y-4">
        <p className="text-sm">
          Specter is where operatives stop reading about attacks and start
          performing them. The first sub-track teaches OSINT at a level no
          public training currently reaches. The second teaches how to move
          across a network and through the air. The third teaches how to slip
          past the people watching for you — and how to disrupt them when you
          can&apos;t.
        </p>
        <p className="text-sm text-muted">
          Each sub-track is independent. You can take them in order or
          specialise. Specter I ships first; Specter II and III follow.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-amber text-lg">Sub-tracks</h2>
        <ul className="space-y-4">
          {SUBTRACKS.map((s) => {
            const isLive = s.status === "LIVE";
            const statusLabel =
              s.status === "LIVE"
                ? "Live"
                : s.status === "SOON"
                  ? "Coming Soon"
                  : "Planned";
            const statusCls =
              s.status === "LIVE"
                ? "text-green"
                : s.status === "SOON"
                  ? "text-amber"
                  : "text-muted";

            const header = (
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-amber text-xl font-display">
                    {s.numeral}
                  </span>
                  <h3
                    className={`text-base ${
                      isLive ? "text-amber" : "text-text"
                    }`}
                  >
                    {s.title}
                  </h3>
                </div>
                <span
                  className={`text-xs uppercase tracking-wider ${statusCls}`}
                >
                  {statusLabel}
                </span>
              </div>
            );

            const body = (
              <>
                <p className="text-xs text-muted mt-1 mb-3">{s.levels}</p>
                <p className="text-sm text-text">{s.pitch}</p>
              </>
            );

            if (isLive) {
              return (
                <li
                  key={s.slug}
                  className="border border-border hover:border-amber transition-colors"
                >
                  <Link
                    href={`/tracks/${s.slug}`}
                    className="block p-4 no-underline"
                  >
                    {header}
                    {body}
                    <p className="text-xs text-amber mt-3 uppercase tracking-wider">
                      Enter →
                    </p>
                  </Link>
                </li>
              );
            }

            return (
              <li
                key={s.slug}
                className="border border-border/60 p-4 opacity-70"
              >
                {header}
                {body}
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="border-t border-border pt-4 space-y-2">
        <p className="text-sm text-muted">
          Specter I is live — first-bloods get announced on the{" "}
          <a
            href={DISCORD_INVITE_URL}
            className="text-amber hover:underline"
            rel="noreferrer"
          >
            Discord
          </a>{" "}
          as they land. II and III drop announcements ship there too.
        </p>
        <p className="text-xs text-muted">
          New here?{" "}
          <Link href="/tracks/ghost" className="text-amber hover:underline">
            Start with Ghost
          </Link>{" "}
          or{" "}
          <Link href="/tracks/phantom" className="text-amber hover:underline">
            advance through Phantom
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
