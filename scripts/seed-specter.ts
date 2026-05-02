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
