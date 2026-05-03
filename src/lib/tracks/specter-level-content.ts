// Prose for each Specter level page. Mirrors phantom-level-content.ts /
// ghost-level-content.ts: a concrete `goal` (rendered as the Mission body)
// plus a short `realWorldSkill` callout that explains why the technique
// matters in modern OSINT engagements. The DB `description` column is kept
// as a sparse fallback only.

export type SpecterLevelContent = {
  goal: string;
  realWorldSkill: string;
};

export const SPECTER_LEVEL_CONTENT: Record<number, SpecterLevelContent> = {
  0: {
    goal:
      "Build a 7-item infrastructure dossier on a target domain using only public records — WHOIS, DNS, certificate transparency, breach DBs, CI build leaks. No active scanning, no packets to the target.",
    realWorldSkill:
      "Every OSINT engagement starts with passive recon. Touch the target's network and you tip them off before you even know what you're looking at.",
  },
  1: {
    goal:
      "Surface admin panels, IoT consoles, leaked API keys and indexed creds through dorks across at least two independent search stacks. Single-engine answers are rejected as ambiguous.",
    realWorldSkill:
      "Operators who only know one search engine miss half the indexed surface. Engine diversity is what separates trained operators from copy-paste dorkers.",
  },
  2: {
    goal:
      "Recover scattered secrets through three independent tooling stacks — GitHub dorking, Wayback, raw git history, code-indexing SaaS. Spot the deactivated-key SOC canaries before you submit them.",
    realWorldSkill:
      "Modern leaks live in commits, not just pastebins. Tool-churn resilience is what keeps you working when one source goes dark or starts seeding canaries.",
  },
  3: {
    goal:
      "Pull a single-page app's bundle apart for sourcemaps, hardcoded JWT secrets, hidden admin endpoints and vendored CVE-pinned libs. Three blogs citing the same wrong endpoint count as one source — verify against the bundle itself.",
    realWorldSkill:
      "Every modern web target ships its own attack surface in compiled JS. Reading bundles is a baseline 2026 skill — the easy creds are in the client.",
  },
  4: {
    goal:
      "Build a 30-person org chart from a single email seed across four cohorts. Grade every finding Admiralty A1-F6 and verify source independence (no daisy-chained citations).",
    realWorldSkill:
      "Real engagements pivot on people, not boxes. Sourcing discipline is what makes a finding actionable instead of speculative gossip the target's lawyers will laugh at.",
  },
  5: {
    goal:
      "Construct a persona that survives a 21-day platform warmup plus five SOC probes (photo provenance, timezone consistency, follow-graph entropy, stylometric consistency, warmup pacing), then infiltrate the target's candidate Slack and exfil intel under a lite Berkeley Protocol.",
    realWorldSkill:
      "The persona IS the operation. One detection burns the whole investigation and tips the target — there is no \"warning\" round in adversarial OSINT.",
  },
  6: {
    goal:
      "Pin five photos to ±50 m via shadow azimuth, OSM landmark match, signage script, biome convergence and counter-evidence rejection. One photo carries planted EXIF that traces back to you on reverse-search — strip metadata before pivoting or burn the persona.",
    realWorldSkill:
      "Every photo is a tracker. Geolocating without leaving a trail is the daily job for HRD investigators, conflict journalists and any operator running a sock puppet through image-rich platforms.",
  },
  7: {
    goal:
      "Authenticate one reference photo, four candidate photos and one candidate video against eight forensic axes (Yandex face cluster, Google Lens scene, TinEye exact-match, Bing narrative context, lighting cone, Daugman iris, C2PA registry, lipsync bilabial alignment). One candidate is adversarially perturbed to defeat spectral checks — iris + lighting cone are the gate.",
    realWorldSkill:
      "Disinfo and deepfakes flood every modern OSINT investigation. Knowing which forensic axes survive adversarial inputs is the 2026 baseline — the easy ones (spectral, EXIF) are already defeated by off-the-shelf generators.",
  },
  8: {
    goal:
      "Reconstruct thirty days of social media + Telegram into a timeline. Identify home, workplace and family residence. Fuse ADS-B for flights, AIS for ferries, and Strava heatmaps for routine.",
    realWorldSkill:
      "Pattern of life is the OSINT primitive that drives everything from investigative journalism to executive protection to targeted action.",
  },
  9: {
    goal:
      "Unmask a shell-company beneficial owner via SEC EDGAR + Companies House common-director graph analysis. Map the supply chain through trade data (ImportYeti, Datasur, Panjiva) and detect sanctions exposure through the chain.",
    realWorldSkill:
      "Sanctions enforcement, fraud investigation and supply-chain compromise all run on the same corporate-records primitives — once you can chain them, the entire commercial graph opens up.",
  },
  10: {
    goal:
      "Distinguish a real breach dump from scraped recycled data, imposter posts and disinfo across Tor, Ahmia, ransomware leak sites and BreachForums. Spot the attribution false flags before they end up in a report.",
    realWorldSkill:
      "Dark-web reporting is ninety percent noise and recycled data. The discipline is filtering — finding is the easy half, attribution is what gets you sued.",
  },
  11: {
    goal:
      "Channel monitoring, group infiltration tradecraft, geographic intelligence collection from active operations, and threat-actor coordination signals — the post-2022 OSINT goldmine.",
    realWorldSkill:
      "Since 2022 every serious actor — APT, ransomware, militia, activist — coordinates on Telegram. Operating there cleanly is a baseline modern skill, not a niche one.",
  },
  12: {
    goal:
      "The target fights back. Classify five intel candidates: three are SOC traps (canary tokens, dangle accounts that alert on login, poisoned pastes with backdoored creds, watermarked leaks, fake-leak campaigns à la 0APT 2025), two are real.",
    realWorldSkill:
      "Mature defenders bait OSINT operators with traps. Spotting them is the difference between stealing intel and burning your operation in front of the SOC's own dashboard.",
  },
  13: {
    goal:
      "Ninety-minute capstone — five employees, one valid credential, two internal hostnames, supply-chain partners, cloud provider, one misconfiguration with proof. No honeypots tripped, sock-puppet trail clean. Submit a Berkeley Protocol-aligned report.",
    realWorldSkill:
      "Real OSINT work — for journalism, prosecution or HRD — only counts if the methodology survives adversarial review. The Berkeley Protocol is the standard your evidence is judged against in court.",
  },
};

export function getSpecterLevelContent(
  idx: number,
): SpecterLevelContent | null {
  return SPECTER_LEVEL_CONTENT[idx] ?? null;
}
