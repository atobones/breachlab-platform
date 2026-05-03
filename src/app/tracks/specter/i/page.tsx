import Link from "next/link";
import { DISCORD_INVITE_URL } from "@/lib/links";

type LevelRow = {
  idx: number;
  name: string;
  pitch: string;
  status?: "DEPLOYED" | "BUILD" | "QUEUED";
};

const LEVELS: LevelRow[] = [
  {
    idx: 0,
    name: "Paper Trail",
    pitch:
      "Domain and infrastructure recon. WHOIS current vs historical, DNS triage with decoys, certificate transparency, MX/CNAME inference, breach-DB cross-reference, internal hostnames leaked in CI build logs.",
    status: "DEPLOYED",
  },
  {
    idx: 1,
    name: "Search Engine Operator",
    pitch:
      "Multi-engine pivots: Shodan banner → Censys cert → CT subdomains → Google dork → Wayback diff → secret. Single-engine answers are rejected as unconfirmed. 30–50% of plausible hits are honeypots, decoys, or tarpits.",
    status: "DEPLOYED",
  },
  {
    idx: 2,
    name: "Code & Secret Hunting",
    pitch:
      "GitHub/GitLab/gist dorks, deleted commits via git log --all, Postman public collections, Trello and Notion API leaks. Verify each credential — real, sandbox, rotated, or canary. Tool-churn resilience: solve via three independent stacks.",
    status: "DEPLOYED",
  },
  {
    idx: 3,
    name: "JS Recon & API Discovery",
    pitch:
      "Fetch and deobfuscate frontend JavaScript, extract API endpoints, GraphQL introspection, hidden feature flags. Find the non-public API leak. Resist dependent-source traps where three different blogs cite the same wrong endpoint.",
    status: "DEPLOYED",
  },
  {
    idx: 4,
    name: "People Recon — Source Independence",
    pitch:
      "Build a 30-person org chart from one email. Decision-makers, technical leads, contractors. Grade each finding with NATO Admiralty reliability (A1–F6). Assign calibrated confidence (WEPs). Verifier rejects three-dependent-sources triangulation as wrong.",
    status: "DEPLOYED",
  },
  {
    idx: 5,
    name: "Sock Puppet Operational Tradecraft",
    pitch:
      "Create a persona that survives platform anomaly detection. Account aging, follow-graph entropy, stylometric consistency, browser-fingerprint compartmentalisation, burn protocol. Bellingcat 2024 self-own as instructional case.",
    status: "DEPLOYED",
  },
  {
    idx: 6,
    name: "Image Geolocation & EXIF Discipline",
    pitch:
      "Five photos to city block. Shadow angle and sun azimuth, OSM building ID, signage script, vegetation biome. One photo carries EXIF that traces back to you if uploaded to reverse-search platforms. Strip metadata before pivoting — or get doxed.",
    status: "DEPLOYED",
  },
  {
    idx: 7,
    name: "Reverse Image & Synthetic Media Detection",
    pitch:
      "Yandex-first face search across multi-engine workflow. Two of five candidates are AI-generated — detect deepfake artifacts, generative inconsistencies, lighting impossibilities. Treat every image as synthetic until proven otherwise.",
    status: "DEPLOYED",
  },
  {
    idx: 8,
    name: "Travel Pattern Reconstruction",
    pitch:
      "Thirty days of social media plus Telegram channels reconstructed into a timeline. Identify home, workplace, family residence. Multi-source fusion: ADS-B for flights, AIS for ferries, Strava heatmap signal.",
    status: "DEPLOYED",
  },
  {
    idx: 9,
    name: "Corporate Intel & Supply Chain",
    pitch:
      "SEC EDGAR and Companies House. Unmask shell company ownership through common-director graph analysis. Map supply chain via trade data — ImportYeti, Datasur, Panjiva. Sanctioned-entity detection through chain analysis.",
    status: "DEPLOYED",
  },
  {
    idx: 10,
    name: "Dark Web Intel",
    pitch:
      "Tor, Ahmia, Recorded Future, ransomware leak sites, BreachForums monitoring. Distinguish a real dump from scraped recycled data, from imposter posts, from disinfo campaigns. Attribution false-flags.",
    status: "DEPLOYED",
  },
  {
    idx: 11,
    name: "Telegram & Encrypted-Channel Intel",
    pitch:
      "The post-2022 OSINT goldmine. Channel monitoring, group infiltration tradecraft, geographic intelligence collection during active operations. Threat-actor coordination signals.",
    status: "DEPLOYED",
  },
  {
    idx: 12,
    name: "Adversarial OSINT",
    pitch:
      "The target fights back. Detect canary tokens, dangle accounts that alert SOC on login, poisoned pastes with backdoored creds, watermarked leaks, fake-leak campaigns (0APT 2025 case). Classify five candidates: three traps, two real.",
    status: "DEPLOYED",
  },
  {
    idx: 13,
    name: "Full Engagement — Berkeley Protocol Report",
    pitch:
      "Ninety-minute capstone. Five employees, one valid credential, two internal hostnames, supply-chain partners, cloud provider, one misconfiguration with proof — without triggering honeypots, with sock-puppet trail clean. Submit a Berkeley Protocol-aligned written report. Findings stand up in court.",
    status: "DEPLOYED",
  },
];

const STATUS_STYLE: Record<NonNullable<LevelRow["status"]>, string> = {
  DEPLOYED: "text-green",
  BUILD: "text-amber",
  QUEUED: "text-muted",
};

export default function SpecterIPage() {
  return (
    <div className="space-y-12 max-w-3xl">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-amber text-2xl">Specter I — OSINT</h1>
          <span className="text-xs uppercase tracking-wider px-2 py-0.5 border border-green text-green">
            Live
          </span>
        </div>
        <p className="text-sm text-muted">
          Fourteen levels. Passive intelligence at professional grade. Built for
          operatives who will be asked to investigate real targets, not pass a
          quiz.
        </p>
      </header>

      <section className="space-y-3">
        <p className="text-sm">
          Most OSINT training teaches you to type queries into search engines.
          That is the first ten percent. The other ninety percent — source
          independence, calibrated confidence, operational discipline against a
          target who counter-investigates, defensible documentation — is where
          professionals actually live, and where almost no public course goes.
        </p>
        <p className="text-sm">
          Specter I goes there. By the time you finish the capstone, your
          findings stand up to legal scrutiny, your tradecraft survives
          adversarial counter-intelligence, and your written report meets
          Berkeley Protocol standards.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-amber text-lg">What makes this different</h2>
        <ul className="space-y-3 text-sm">
          <li className="border-l-2 border-amber pl-3">
            <strong className="text-amber">
              Operational discipline graded throughout.
            </strong>{" "}
            EXIF leaks, persona-real-account cross-pollination, query timing
            patterns — all detected and scored. No other training treats analyst
            OPSEC as a graded outcome.
          </li>
          <li className="border-l-2 border-amber pl-3">
            <strong className="text-amber">Adversarial targets.</strong> From
            level twelve onward you face counter-intelligence: canary tokens,
            dangle accounts, watermarked documents, fake leaks. Detect the trap
            or trip the alarm.
          </li>
          <li className="border-l-2 border-amber pl-3">
            <strong className="text-amber">
              Calibrated confidence required.
            </strong>{" "}
            Every claim from level four onward carries a word-of-estimative-
            probability rating (Admiralty A1–F6). Overconfident wrong answers
            cost more than honest uncertainty.
          </li>
          <li className="border-l-2 border-amber pl-3">
            <strong className="text-amber">
              Berkeley Protocol report at graduation.
            </strong>{" "}
            The capstone requires a written intelligence package with chain of
            custody, source documentation, and alternative-hypothesis
            consideration. Defensible methodology, not just a flag.
          </li>
          <li className="border-l-2 border-amber pl-3">
            <strong className="text-amber">
              Quarterly errata, public dashboard.
            </strong>{" "}
            OSINT tools rot fast. Twitter API, CrowdTangle, half of 2018&apos;s
            stack — all dead. Our errata page is public; we re-shoot levels
            when the underlying primitive shifts. No 2018 advice in 2026
            wrapping.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-amber text-lg">The fourteen levels</h2>
        <ol className="space-y-3 text-sm">
          {LEVELS.map((l) => (
            <li
              key={l.idx}
              className="border-b border-border pb-3 last:border-b-0"
            >
              <div className="flex items-baseline justify-between gap-4 mb-1">
                <h3 className="text-amber">
                  L{l.idx}{" "}
                  <span className="text-text">— {l.name}</span>
                </h3>
                {l.status && (
                  <span
                    className={`text-xs uppercase tracking-wider ${STATUS_STYLE[l.status]}`}
                  >
                    {l.status === "DEPLOYED"
                      ? "Live"
                      : l.status === "BUILD"
                        ? "In Build"
                        : "Queued"}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted">{l.pitch}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">After this track</h2>
        <p className="text-sm">
          You will be able to investigate a target end-to-end without leaving a
          trail, defend the report under cross-examination, and recognise when
          you are being counter-investigated. You will be a credible OSINT
          analyst at a tier most public certification graduates never reach.
        </p>
      </section>

      <section className="space-y-3 border border-green p-4">
        <h2 className="text-green text-lg">Status — Live</h2>
        <p className="text-sm">
          Specter I is live. All fourteen levels are accessible via per-session
          ephemeral containers; each level passes our 27-class security audit
          before it ships. Sessions are isolated per player — no shared shell,
          no cross-contamination, no flag sharing.
        </p>
        <p className="text-sm text-muted">
          If a level is briefly unreachable during a rolling deploy, retry in
          a few minutes — sessions are stateless, your chain progress is
          preserved server-side.
        </p>
      </section>

      <footer className="border-t border-border pt-4 space-y-2">
        <p className="text-sm">
          Connect via{" "}
          <Link
            href="/dashboard"
            className="text-amber hover:underline"
          >
            your dashboard
          </Link>{" "}
          for the per-player SSH commands, or{" "}
          <a
            href={DISCORD_INVITE_URL}
            className="text-amber hover:underline"
            rel="noreferrer"
          >
            join the Discord
          </a>{" "}
          for first-blood announcements.
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
