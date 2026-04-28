import Link from "next/link";
import { DISCORD_INVITE_URL } from "@/lib/links";

const BLOCKS = [
  {
    name: "Network Attacks",
    pitch:
      "ARP spoofing, LLMNR/NBT-NS poisoning with responder, MITM extraction with bettercap, network pivoting through compromised hosts.",
  },
  {
    name: "Wireless",
    pitch:
      "WPA2 four-way handshake capture and crack, PMKID attacks, evil twin and Karma APs, deauthentication, WPA Enterprise downgrade.",
  },
];

export default function SpecterIIPage() {
  return (
    <div className="space-y-10 max-w-3xl">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-amber text-2xl">Specter II — Network &amp; Wireless</h1>
          <span className="text-xs uppercase tracking-wider px-2 py-0.5 border border-muted text-muted">
            Planned
          </span>
        </div>
        <p className="text-sm text-muted">
          Eight levels. Initial access through the wire and through the air.
        </p>
      </header>

      <section className="space-y-3">
        <p className="text-sm">
          Specter I gives you the intelligence package. Specter II teaches you
          how to convert intelligence into a foothold. ARP-level layer-two
          attacks, wireless cracking and rogue access points, network-pivot
          tradecraft against modern segmented environments.
        </p>
        <p className="text-sm">
          Wireless levels run against simulated radios — no extra hardware
          required, ephemeral per-session like every Specter level. Real-tools
          tradecraft (aircrack-ng, hostapd-wpe, eaphammer) on a kernel
          configured to behave like a real RF environment.
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
          Design begins after Specter I ships. Wireless level infrastructure
          requires kernel-side decisions (mac80211_hwsim host config) that we
          will tackle when the curriculum lands here.
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
