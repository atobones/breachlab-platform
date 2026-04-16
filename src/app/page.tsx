import Link from "next/link";

const TRACKS = [
  {
    number: 1,
    name: "Ghost",
    href: "/tracks/ghost",
    status: "LIVE" as const,
    difficulty: "Foundation",
    levels: 23,
    summary:
      "Linux and shell fundamentals. File navigation, special filenames, hidden files, permissions, grep, port enumeration, environment variables, encoding, process forensics. Where every operator starts.",
  },
  {
    number: 2,
    name: "Phantom",
    href: "/tracks/phantom",
    status: "LIVE" as const,
    difficulty: "Intermediate",
    levels: 21,
    summary:
      "Post-exploitation and privilege escalation. SUID exploits, sudo misconfigurations, cron hijacking, Docker escape, Linux capabilities abuse. What happens after you get a shell.",
  },
  {
    number: 3,
    name: "Specter",
    href: "/tracks/ghost",
    status: "SOON" as const,
    difficulty: "Intermediate",
    levels: null,
    summary:
      "Web application security. JWT manipulation, OAuth misconfigs, SSRF → cloud metadata, GraphQL introspection, SSTI, prototype pollution. The modern attack surface.",
  },
  {
    number: 4,
    name: "Cipher",
    href: "#",
    status: "PLANNED" as const,
    difficulty: "Advanced",
    levels: null,
    summary:
      "Applied cryptography. Padding oracles, hash length extension, weak RNG exploitation, TLS downgrade, certificate pinning bypass.",
  },
  {
    number: 5,
    name: "Mirage",
    href: "#",
    status: "PLANNED" as const,
    difficulty: "Advanced",
    levels: null,
    summary:
      "Cloud and infrastructure. AWS IAM escalation, S3 misconfigs, Kubernetes RBAC abuse, Terraform state exploitation, CI/CD pipeline attacks.",
  },
  {
    number: 6,
    name: "Nexus",
    href: "#",
    status: "PLANNED" as const,
    difficulty: "Advanced",
    levels: null,
    summary:
      "AI/ML security. Prompt injection, model extraction, training data poisoning, adversarial inputs, LLM-powered attack chains.",
  },
  {
    number: 7,
    name: "Oracle",
    href: "#",
    status: "PLANNED" as const,
    difficulty: "Expert",
    levels: null,
    summary:
      "The final exam. Multi-stage scenarios combining every track. No hints, no structure, no mercy. Prove you earned the title.",
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
        <h1 className="text-amber text-2xl">BreachLab</h1>
        <p className="text-sm text-text max-w-2xl">
          A wargame series for learning real-world security. No hand-holding,
          no GUIs, no CTF theatre. Just a terminal, a goal, and the knowledge
          that you earned your way through.
        </p>
        <p className="text-xs text-muted max-w-2xl">
          Each track teaches a different domain of offensive and defensive
          security through progressively harder levels. Complete a track to
          earn an Operative Certificate with a unique serial, shareable
          publicly. First-blood and speedrun records are tracked on the{" "}
          <Link href="/leaderboard" className="text-amber hover:underline">
            leaderboard
          </Link>
          .
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-amber text-sm uppercase tracking-wider">
          Tracks — suggested order
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
                <div className="flex items-center gap-3">
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
            on this site to track your progress and compete on the leaderboard
          </li>
          <li>
            Read the rules in{" "}
            <Link href="/rules" className="text-amber hover:underline">
              📋 /rules
            </Link>
          </li>
          <li>
            Start the Ghost track — it is the foundation for everything else
          </li>
          <li>
            Ask questions in{" "}
            <a
              href="https://discord.gg/hJrteuV6"
              className="text-amber hover:underline"
              rel="noreferrer"
            >
              💬 Discord #help
            </a>
          </li>
        </ul>
      </section>

      <section className="space-y-2 max-w-2xl">
        <h2 className="text-amber text-sm uppercase tracking-wider">
          What you earn
        </h2>
        <ul className="text-xs text-muted space-y-1 list-disc list-inside">
          <li>Per-level points and first-blood bonuses</li>
          <li>
            Operative Certificate with a unique serial, shareable publicly
          </li>
          <li>
            Discord roles (Operative / First Blood / Ghost Master / Phantom
            Operative)
          </li>
          <li>A place on the public Honor Roll</li>
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
