import { notFound } from "next/navigation";
import Link from "next/link";
import { DISCORD_INVITE_URL } from "@/lib/links";

type TrackInfo = {
  name: string;
  status: "SOON" | "PLANNED";
  tagline: string;
};

// Specter has its own dedicated page (/tracks/specter/page.tsx) since it
// shipped Specter I. The catch-all [slug] route below is only for tracks
// still in "Coming Soon" / "Planned" status.
const UPCOMING_TRACKS: Record<string, TrackInfo> = {
  mirage: {
    name: "Mirage",
    status: "PLANNED",
    tagline: "Web application exploitation — the attack surface that never sleeps.",
  },
  cipher: {
    name: "Cipher",
    status: "PLANNED",
    tagline: "Applied cryptography and password attacks — breaking what was meant to be unbreakable.",
  },
  nexus: {
    name: "Nexus",
    status: "PLANNED",
    tagline: "CI/CD and supply chain — where one commit compromises thousands.",
  },
  oracle: {
    name: "Oracle",
    status: "PLANNED",
    tagline: "AI/LLM security — prompt injection, agent exploitation, model attacks.",
  },
  wraith: {
    name: "Wraith",
    status: "PLANNED",
    tagline: "Windows and Active Directory — the other half of the corporate world.",
  },
  shadow: {
    name: "Shadow",
    status: "PLANNED",
    tagline: "Anonymity, OPSEC, Tor, darknet, and counter-forensics — disappear completely.",
  },
  sentinel: {
    name: "Sentinel",
    status: "PLANNED",
    tagline: "Blue team — forensics, incident response, threat hunting, and detection engineering.",
  },
  prism: {
    name: "Prism",
    status: "PLANNED",
    tagline: "Apple security — macOS exploitation, iOS jailbreaking, and ecosystem attacks.",
  },
  venom: {
    name: "Venom",
    status: "PLANNED",
    tagline: "Red team operations — C2 frameworks, implant development, and full engagement simulation.",
  },
  flux: {
    name: "Flux",
    status: "PLANNED",
    tagline: "Binary exploitation, reverse engineering, and malware analysis.",
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

      <section className="space-y-3">
        <p className="text-sm text-muted">
          {track.status === "SOON"
            ? "This track is in active development. Levels are being built and tested."
            : "This track is on the roadmap. Development begins after earlier tracks ship."}
        </p>
        <p className="text-sm text-muted">
          Want to know when it drops?{" "}
          <a
            href={DISCORD_INVITE_URL}
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
