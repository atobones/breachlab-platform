// Seed Specter I track levels.
//
// Specter L0-L4 were inserted on prod via manual SQL (2026-04-25 →
// 2026-04-29). When the L5 sock-puppet ship landed there was no seed
// script, so this file was created retroactively to cover L5 forward
// and serve as the canonical record of the level set going forward.
//
// Behaviour: idempotent — INSERT-IF-NOT-EXISTS only. Will NOT update
// existing rows. To revise a title or points, edit the row directly
// in the DB (running this script will skip a row that already has the
// matching idx, even if the title/points differ).
//
// Usage: `npx tsx scripts/seed-specter.ts` after deploying a new level.
//
// Specter flags are per-player HMAC (see src/lib/specter/flags.ts) —
// no row is inserted into the `flags` table for Specter levels, in
// contrast to seed-ghost.ts / seed-phantom.ts which seed canonical
// flag hashes for those tracks.

import { db } from "../src/lib/db/client";
import { tracks, levels } from "../src/lib/db/schema";
import { eq, and } from "drizzle-orm";

type SpecterLevel = {
  idx: number;
  slug: string; // for human reference; not stored — slug ↔ idx mapping
                // lives in src/lib/specter/flags.ts (SPECTER_LEVEL_SLUGS)
  title: string;
  description: string;
  pointsBase: number;
  pointsFirstBloodBonus: number;
};

// Specter I levels in chain order. Keep idx in sync with
// SPECTER_LEVEL_SLUGS in src/lib/specter/flags.ts.
const SPECTER_LEVELS: SpecterLevel[] = [
  {
    idx: 0,
    slug: "paper-trail",
    title: "Paper Trail",
    description:
      "Passive domain + infrastructure recon. Identify seven distinct intelligence items via WHOIS, DNS, certificate transparency, breach DBs, and CI build leaks. Verified-vs-rumor discipline.",
    pointsBase: 400,
    pointsFirstBloodBonus: 50,
  },
  {
    idx: 1,
    slug: "search-operator",
    title: "Search Engine Operator",
    description:
      "Multi-engine pivots — verifier rejects single-engine answers as ambiguous. Surface accidentally-indexed admin panels, IoT devices, leaked API keys, shadow subdomains, and creds in indexed docs across at least two independent search stacks.",
    pointsBase: 500,
    pointsFirstBloodBonus: 50,
  },
  {
    idx: 2,
    slug: "code-hunter",
    title: "Code & Secret Hunting",
    description:
      "Tool-churn resilience. Recover scattered secrets via three independent tooling stacks (GitHub dorking, Wayback, direct git history, code-indexing SaaS). Detect deactivated-key SOC canaries.",
    pointsBase: 600,
    pointsFirstBloodBonus: 50,
  },
  {
    idx: 3,
    slug: "js-recon",
    title: "JS Recon & API Discovery",
    description:
      "Pull the SPA bundles apart. Sourcemaps, hardcoded JWT secrets, service-worker admin endpoints, vendored CVE-pinned libs. Dependent-source trap — three blogs citing the same wrong endpoint count as one source.",
    pointsBase: 700,
    pointsFirstBloodBonus: 50,
  },
  {
    idx: 4,
    slug: "people-recon",
    title: "People Recon & Source Independence",
    description:
      "Build a 30-person org chart from a single email seed. Four cohorts, Admiralty A1-F6 grading per finding, source-independence verification. ACH+WEP discipline introduced.",
    pointsBase: 800,
    pointsFirstBloodBonus: 50,
  },
  {
    idx: 5,
    slug: "sock-puppet",
    title: "Sock Puppet Operational Tradecraft",
    description:
      "Construct a persona that survives platform anomaly detection and a 21-day warmup, infiltrate the target's candidate-Slack, exfil intel under a lite Berkeley Protocol. Five SOC probes (photo provenance, timezone consistency, warmup pacing, follow-graph entropy, stylometric consistency) — any one detection = persona burned.",
    pointsBase: 900,
    pointsFirstBloodBonus: 50,
  },
  {
    idx: 6,
    slug: "image-geo",
    title: "Image Geolocation & EXIF Discipline",
    description:
      "Five photos to street-block (±50m) precision via shadow azimuth, OSM landmark match, signage script, biome convergence + counter-evidence rejection. One photo carries planted EXIF that traces back to you on reverse-search — strip metadata before pivoting or burn the persona. WEP calibration on every axis.",
    pointsBase: 1000,
    pointsFirstBloodBonus: 75,
  },
  {
    idx: 7,
    slug: "reverse-image",
    title: "Reverse Image & Synthetic Media Detection",
    description:
      "Authenticate one reference photo + four candidate photos + one candidate video against eight forensic axes (Yandex face cluster, Google Lens scene, TinEye exact-match, Bing narrative context, lighting cone, Daugman iris consistency, C2PA + AI-image registry, lipsync bilabial-dip alignment). One candidate is adversarially perturbed to defeat spectral checks — iris + lighting cone are the gate.",
    pointsBase: 1200,
    pointsFirstBloodBonus: 100,
  },
  {
    idx: 8,
    slug: "travel-pattern",
    title: "Travel Pattern Reconstruction",
    description:
      "Thirty days of social media + Telegram channels reconstructed into a timeline. Identify home, workplace, family residence. Multi-source fusion: ADS-B for flights, AIS for ferries, Strava heatmap signal.",
    pointsBase: 1300,
    pointsFirstBloodBonus: 100,
  },
  {
    idx: 9,
    slug: "corporate-intel",
    title: "Corporate Intel & Supply Chain",
    description:
      "SEC EDGAR + Companies House. Unmask shell company ownership through common-director graph analysis. Map supply chain via trade data — ImportYeti, Datasur, Panjiva. Sanctioned-entity detection through chain analysis.",
    pointsBase: 1400,
    pointsFirstBloodBonus: 100,
  },
  {
    idx: 10,
    slug: "dark-web",
    title: "Dark Web Intel",
    description:
      "Tor, Ahmia, Recorded Future, ransomware leak sites, BreachForums monitoring. Distinguish a real dump from scraped recycled data, from imposter posts, from disinfo campaigns. Attribution false-flags.",
    pointsBase: 1500,
    pointsFirstBloodBonus: 100,
  },
  {
    idx: 11,
    slug: "telegram-intel",
    title: "Telegram & Encrypted-Channel Intel",
    description:
      "The post-2022 OSINT goldmine. Channel monitoring, group infiltration tradecraft, geographic intelligence collection during active operations. Threat-actor coordination signals.",
    pointsBase: 1600,
    pointsFirstBloodBonus: 100,
  },
  {
    idx: 12,
    slug: "adversarial-osint",
    title: "Adversarial OSINT",
    description:
      "The target fights back. Detect canary tokens, dangle accounts that alert SOC on login, poisoned pastes with backdoored creds, watermarked leaks, fake-leak campaigns (0APT 2025 case). Classify five candidates: three traps, two real.",
    pointsBase: 1800,
    pointsFirstBloodBonus: 125,
  },
  {
    idx: 13,
    slug: "berkeley-protocol",
    title: "Full Engagement — Berkeley Protocol Report",
    description:
      "Ninety-minute capstone. Five employees, one valid credential, two internal hostnames, supply-chain partners, cloud provider, one misconfiguration with proof — without triggering honeypots, with sock-puppet trail clean. Submit a Berkeley Protocol-aligned written report. Findings stand up in court.",
    pointsBase: 2500,
    pointsFirstBloodBonus: 150,
  },
];

async function main() {
  const trackSlug = "specter";
  const existing = await db
    .select()
    .from(tracks)
    .where(eq(tracks.slug, trackSlug));

  if (existing.length === 0) {
    throw new Error(
      `tracks.slug='${trackSlug}' not found. Specter track must be created via earlier migration; this script only seeds levels.`
    );
  }
  const trackId = existing[0].id;
  console.log(`Specter track: ${trackId}`);

  let inserted = 0;
  let skipped = 0;
  for (const l of SPECTER_LEVELS) {
    const existingLevel = await db
      .select({ id: levels.id })
      .from(levels)
      .where(and(eq(levels.trackId, trackId), eq(levels.idx, l.idx)))
      .limit(1);
    if (existingLevel.length > 0) {
      console.log(`L${l.idx} (${l.slug}) already exists, skipping`);
      skipped += 1;
      continue;
    }
    await db.insert(levels).values({
      trackId,
      idx: l.idx,
      title: l.title,
      description: l.description,
      pointsBase: l.pointsBase,
      pointsFirstBloodBonus: l.pointsFirstBloodBonus,
    });
    console.log(`L${l.idx} (${l.slug}) inserted: "${l.title}" / ${l.pointsBase}pt`);
    inserted += 1;
  }

  console.log(`done — inserted=${inserted} skipped=${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
