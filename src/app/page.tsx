import Link from "next/link";

const TRACKS = [
  {
    number: 1,
    name: "Ghost",
    href: "/tracks/ghost",
    status: "LIVE" as const,
    difficulty: "Foundation",
    levels: 22,
    summary:
      "Linux and shell fundamentals. Navigation, permissions, processes, encoding, network, SSH keys, port scanning, cron, git forensics, /proc. Where every operator starts.",
  },
  {
    number: 2,
    name: "Phantom",
    href: "/tracks/phantom",
    status: "LIVE" as const,
    difficulty: "Intermediate → Advanced",
    levels: 32,
    summary:
      "Post-exploitation — the full chain. SUID, sudo, capabilities, kernel CVEs, credential harvesting, persistence, defense evasion, lateral movement, container escape, Kubernetes takeover, cloud pivot, data exfiltration, operational cleanup.",
  },
  {
    number: 3,
    name: "Specter",
    href: "/tracks/specter",
    status: "SOON" as const,
    difficulty: "Intermediate",
    levels: 30,
    summary:
      "Initial access — how you get in. OSINT, network attacks, WiFi exploitation, phishing, social engineering, DDoS, firewall and IDS evasion, physical access.",
  },
  {
    number: 4,
    name: "Mirage",
    href: "/tracks/mirage",
    status: "PLANNED" as const,
    difficulty: "Intermediate → Advanced",
    levels: 28,
    summary:
      "Web exploitation. SQL injection, XSS, auth bypass, SSRF, deserialization, API abuse, SSTI, HTTP request smuggling. The biggest attack surface in the world.",
  },
  {
    number: 5,
    name: "Cipher",
    href: "/tracks/cipher",
    status: "PLANNED" as const,
    difficulty: "Intermediate",
    levels: 20,
    summary:
      "Cryptography and password attacks. Hash cracking, TLS exploitation, padding oracle, RSA vulnerabilities, JWT forgery, credential stuffing.",
  },
  {
    number: 6,
    name: "Nexus",
    href: "/tracks/nexus",
    status: "PLANNED" as const,
    difficulty: "Advanced",
    levels: 22,
    summary:
      "CI/CD and supply chain. Git secrets, pipeline poisoning, dependency confusion, container registry attacks, IaC exploitation.",
  },
  {
    number: 7,
    name: "Oracle",
    href: "/tracks/oracle",
    status: "PLANNED" as const,
    difficulty: "Advanced",
    levels: 18,
    summary:
      "AI/LLM security. Prompt injection, jailbreaking, data exfiltration through LLMs, agent exploitation, RAG poisoning, model attacks.",
  },
  {
    number: 8,
    name: "Wraith",
    href: "/tracks/wraith",
    status: "PLANNED" as const,
    difficulty: "Intermediate → Advanced",
    levels: 30,
    summary:
      "Windows and Active Directory. PowerShell, token impersonation, Kerberoasting, pass-the-hash, DCSync, Golden Ticket, AMSI bypass, GPO abuse.",
  },
  {
    number: 9,
    name: "Shadow",
    href: "/tracks/shadow",
    status: "PLANNED" as const,
    difficulty: "All levels",
    levels: 25,
    summary:
      "Anonymity, OPSEC, and darknet. Tor, VPN chains, anonymous communications, cryptocurrency privacy, counter-forensics, attribution resistance.",
  },
  {
    number: 10,
    name: "Sentinel",
    href: "/tracks/sentinel",
    status: "PLANNED" as const,
    difficulty: "Intermediate → Advanced",
    levels: 25,
    summary:
      "Blue team. Log analysis, SIEM, incident response, memory forensics, malware analysis, network defense, hardening, threat hunting, detection engineering.",
  },
  {
    number: 11,
    name: "Prism",
    href: "/tracks/prism",
    status: "PLANNED" as const,
    difficulty: "Advanced",
    levels: 22,
    summary:
      "Apple security. macOS SIP/TCC/Gatekeeper bypass, Keychain extraction, iOS jailbreak fundamentals, app analysis, AirDrop exploitation.",
  },
  {
    number: 12,
    name: "Venom",
    href: "/tracks/venom",
    status: "PLANNED" as const,
    difficulty: "Expert",
    levels: 25,
    summary:
      "Red team operations. C2 frameworks, implant development, payload delivery, infrastructure setup, EDR bypass, campaign planning, purple teaming.",
  },
  {
    number: 13,
    name: "Flux",
    href: "/tracks/flux",
    status: "PLANNED" as const,
    difficulty: "Advanced → Expert",
    levels: 25,
    summary:
      "Binary exploitation and reverse engineering. Stack overflow, ROP, heap, shellcoding, mitigation bypass, malware RE, firmware analysis, exploit development.",
  },
];

const STATUS_STYLE = {
  LIVE: "text-green-500",
  SOON: "text-amber",
  PLANNED: "text-muted",
} as const;

export default function HomePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-amber text-2xl inline-flex items-baseline">
          BreachLab<span className="cursor" aria-hidden />
        </h1>
        <p className="text-sm text-text max-w-2xl">
          The most comprehensive offensive security training platform in the
          world. 13 tracks, 320+ levels, zero hand-holding. From
          Linux basics to red team operations, container escapes to darknet
          OPSEC, web exploitation to AI/LLM attacks. No other platform covers
          this range in one place.
        </p>
        <p className="text-xs text-muted max-w-2xl">
          Each track teaches a different domain through progressively harder
          levels on real vulnerable infrastructure. No simulations — real
          software, real CVEs, real tools. Complete a track to earn an
          Operative Certificate. First-blood and speedrun records on the{" "}
          <Link href="/leaderboard" className="text-amber hover:underline">
            leaderboard
          </Link>
          .
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-amber text-sm uppercase tracking-wider">
          13 Tracks — from foundation to nation-state
        </h2>
        <div className="space-y-3 max-w-3xl">
          {TRACKS.map((track) => (
            <div
              key={track.name}
              className="flex gap-4 border border-amber/20 hover:border-amber/50 p-4 transition-colors"
            >
              <span className="text-muted text-sm w-6 shrink-0 pt-0.5">
                {track.number}.
              </span>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href={track.href}
                    className="text-amber text-base hover:underline"
                  >
                    {track.name}
                  </Link>
                  <span
                    className={`text-[10px] uppercase tracking-wider ${STATUS_STYLE[track.status]}`}
                  >
                    {track.status}
                  </span>
                  {track.levels && (
                    <span className="text-[10px] text-muted">
                      {track.levels} levels
                    </span>
                  )}
                  <span className="text-[10px] text-muted">
                    {track.difficulty}
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {track.summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2 max-w-2xl">
        <h2 className="text-amber text-sm uppercase tracking-wider">
          How it works
        </h2>
        <ul className="text-xs text-muted space-y-1 list-disc list-inside">
          <li>
            <Link href="/register" className="text-amber hover:underline">
              Register
            </Link>{" "}
            to track progress and compete on the leaderboard
          </li>
          <li>
            Read the{" "}
            <Link href="/rules" className="text-amber hover:underline">
              rules
            </Link>
          </li>
          <li>
            Start the Ghost track — the foundation for everything else
          </li>
          <li>
            Ask questions in{" "}
            <a
              href="https://discord.gg/hJrteuV6"
              className="text-amber hover:underline"
              rel="noreferrer"
            >
              Discord
            </a>
          </li>
        </ul>
      </section>

      <section className="space-y-2 max-w-2xl">
        <h2 className="text-amber text-sm uppercase tracking-wider">
          What you become
        </h2>
        <ul className="text-xs text-muted space-y-1 list-disc list-inside">
          <li>Ghost + Phantom = Junior Penetration Tester</li>
          <li>Add Mirage + Cipher = Web Security Specialist</li>
          <li>Add Wraith + Venom = Senior Red Team Operator</li>
          <li>All 13 tracks = Full-stack offensive security — nation-state capability</li>
        </ul>
      </section>

      <section className="space-y-2 max-w-2xl">
        <h2 className="text-amber text-sm uppercase tracking-wider">
          What you earn
        </h2>
        <ul className="text-xs text-muted space-y-1 list-disc list-inside">
          <li>Per-level points and first-blood bonuses</li>
          <li>Operative Certificate with unique serial per track</li>
          <li>Discord roles and public Honor Roll</li>
          <li>
            <Link
              href="/hall-of-operatives"
              className="text-amber hover:underline"
            >
              Hall of Operatives
            </Link>{" "}
            for sponsors
          </li>
        </ul>
      </section>

      <footer className="border-t border-amber/10 pt-4 max-w-2xl">
        <p className="text-xs text-muted italic">
          Real skills. Real scenarios. No CTF bullshit.
        </p>
      </footer>
    </div>
  );
}
