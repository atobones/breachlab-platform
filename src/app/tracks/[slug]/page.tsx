import { notFound } from "next/navigation";
import Link from "next/link";

type TrackInfo = {
  name: string;
  status: "SOON" | "PLANNED";
  tagline: string;
  topics: string[];
};

const UPCOMING_TRACKS: Record<string, TrackInfo> = {
  specter: {
    name: "Specter",
    status: "SOON",
    tagline: "Network reconnaissance and service exploitation.",
    topics: [
      "Network scanning and enumeration",
      "Service fingerprinting",
      "Protocol analysis",
      "Man-in-the-middle fundamentals",
      "Wireless and lateral movement basics",
    ],
  },
  cipher: {
    name: "Cipher",
    status: "PLANNED",
    tagline: "Applied cryptography — breaking what was meant to be unbreakable.",
    topics: [
      "Classical ciphers and frequency analysis",
      "Hash cracking and collision attacks",
      "RSA and asymmetric vulnerabilities",
      "TLS/SSL misconfigurations",
      "Real-world crypto implementation flaws",
    ],
  },
  mirage: {
    name: "Mirage",
    status: "PLANNED",
    tagline: "Web application exploitation — the attack surface that never sleeps.",
    topics: [
      "SQL injection and ORM bypass",
      "XSS, CSRF, and session attacks",
      "Authentication and authorization flaws",
      "Server-side request forgery (SSRF)",
      "Deserialization and template injection",
    ],
  },
  nexus: {
    name: "Nexus",
    status: "PLANNED",
    tagline: "CI/CD and supply chain — where one commit compromises thousands.",
    topics: [
      "Git secrets and history mining",
      "Pipeline poisoning",
      "Dependency confusion attacks",
      "Container escape and registry attacks",
      "Infrastructure as Code vulnerabilities",
    ],
  },
  oracle: {
    name: "Oracle",
    status: "PLANNED",
    tagline: "AI/LLM security — the newest and least understood attack surface.",
    topics: [
      "Prompt injection and jailbreaking",
      "Data exfiltration through LLMs",
      "Agent exploitation and tool abuse",
      "Model poisoning and backdoors",
      "RAG and embedding attacks",
    ],
  },
};

export default async function TrackComingSoonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const track = UPCOMING_TRACKS[slug];
  if (!track) notFound();

  return (
    <div className="space-y-8 max-w-2xl" data-testid="track-coming-soon">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-amber text-2xl">{track.name}</h1>
          <span
            className={`text-xs uppercase tracking-wider px-2 py-0.5 border ${
              track.status === "SOON"
                ? "border-amber text-amber"
                : "border-muted text-muted"
            }`}
          >
            {track.status === "SOON" ? "Coming Soon" : "Planned"}
          </span>
        </div>
        <p className="text-sm text-muted">{track.tagline}</p>
      </header>

      <section className="border border-border p-5 space-y-4">
        <h2 className="text-amber text-sm uppercase tracking-wider">
          What this track will cover
        </h2>
        <ul className="space-y-2">
          {track.topics.map((topic) => (
            <li key={topic} className="flex items-start gap-2 text-sm">
              <span className="text-muted mt-0.5">&#x25B8;</span>
              <span>{topic}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <p className="text-sm text-muted">
          {track.status === "SOON"
            ? "This track is in active development. Levels are being built and tested."
            : "This track is on the roadmap. Development begins after earlier tracks ship."}
        </p>
        <p className="text-sm text-muted">
          Want to know when it drops?{" "}
          <a
            href="https://discord.gg/hJrteuV6"
            className="text-amber hover:underline"
            rel="noreferrer"
          >
            Join the Discord
          </a>{" "}
          — announcements go there first.
        </p>
      </section>

      <footer className="border-t border-border pt-4">
        <p className="text-xs text-muted">
          Ready now?{" "}
          <Link href="/tracks/ghost" className="text-amber hover:underline">
            Start with Ghost
          </Link>{" "}
          — the foundation every track builds on.
        </p>
      </footer>
    </div>
  );
}
