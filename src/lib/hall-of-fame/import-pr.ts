/**
 * Import a security credit from a GitHub PR reference.
 *
 * Supported inputs:
 *   - "phantom#32" · "platform#36" · "ghost#13"
 *   - "atobones/breachlab-phantom#32"
 *   - Full PR URL: "https://github.com/atobones/breachlab-phantom/pull/32"
 *
 * What we pull from GitHub:
 *   - title → finding_title
 *   - body → scanned for "Reported by @X" / "Reported-by: @X" / "Credit: @X"
 *           trailer lines (multi-pattern so it matches PR bodies that were
 *           authored casually)
 *   - body → scanned for "Class NN:" ref
 *   - html_url → just reference, not stored
 *
 * Auth: uses GITHUB_TOKEN env var if set (5000 req/hour), falls back to
 * unauthenticated requests (60 req/hour per IP — fine for admin use).
 */

const REPO_MAP: Record<string, string> = {
  phantom: "atobones/breachlab-phantom",
  platform: "atobones/breachlab-platform",
  ghost: "atobones/breachlab-ghost",
};

export type ParsedPrRef = {
  repo: string; // e.g. "atobones/breachlab-phantom"
  slug: string; // e.g. "phantom" (short form for pr_ref storage)
  number: number;
};

export function parsePrRef(raw: string): ParsedPrRef | null {
  const s = raw.trim();
  // Full URL
  const urlMatch = s.match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)\/?/,
  );
  if (urlMatch) {
    const repo = urlMatch[1];
    const slug = slugFromRepo(repo);
    return { repo, slug, number: parseInt(urlMatch[2], 10) };
  }
  // atobones/breachlab-phantom#32
  const fullMatch = s.match(/^([^/\s]+\/[^/\s]+)#(\d+)$/);
  if (fullMatch) {
    const repo = fullMatch[1];
    const slug = slugFromRepo(repo);
    return { repo, slug, number: parseInt(fullMatch[2], 10) };
  }
  // phantom#32
  const shortMatch = s.match(/^([a-z]+)#(\d+)$/i);
  if (shortMatch) {
    const key = shortMatch[1].toLowerCase();
    const repo = REPO_MAP[key];
    if (!repo) return null;
    return { repo, slug: key, number: parseInt(shortMatch[2], 10) };
  }
  return null;
}

function slugFromRepo(repo: string): string {
  // "atobones/breachlab-phantom" → "phantom"
  const name = repo.split("/")[1] ?? repo;
  const m = name.match(/breachlab-([a-z]+)/i);
  if (m) return m[1].toLowerCase();
  return name;
}

type GithubPr = {
  title: string;
  body: string | null;
  html_url: string;
  number: number;
  user: { login: string } | null;
  labels: Array<{ name: string }>;
  merged_at: string | null;
};

async function fetchPr(repo: string, number: number): Promise<GithubPr | null> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/pulls/${number}`,
      { headers, cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as GithubPr;
  } catch {
    return null;
  }
}

// Pattern set for picking up a reporter mention. Order matters — most
// specific first. Returns the raw handle (no @ prefix, no brackets).
const REPORTER_PATTERNS: RegExp[] = [
  /Reported-?by:?\s*@([A-Za-z0-9_!$.-]+)/i,
  /Credit(?:ed)?(?:\s+to)?:?\s*@([A-Za-z0-9_!$.-]+)/i,
  /Via(?:\s+report\s+from)?:?\s*@([A-Za-z0-9_!$.-]+)/i,
  // Discord / Slack style quotes: "reported by sML (Discord)"
  /[Rr]eported by\s+([A-Za-z0-9_!$.-]+)\b/,
  /[Cc]redit to\s+([A-Za-z0-9_!$.-]+)\b/,
];

function extractReporter(body: string | null): string | null {
  if (!body) return null;
  for (const pat of REPORTER_PATTERNS) {
    const m = body.match(pat);
    if (m) return m[1];
  }
  return null;
}

function extractClassRef(body: string | null, title: string): string | null {
  const src = `${title}\n\n${body ?? ""}`;
  const m = src.match(/\bClass\s+(\d+)\s*[:\-–]?\s*([^\n]+?)(?:\s*[\n]|$)/i);
  if (!m) return null;
  const num = m[1];
  const tail = m[2].trim().replace(/[.!?]+$/, "");
  return `Class ${num}${tail ? `: ${tail.slice(0, 80)}` : ""}`;
}

function severityFromLabels(labels: Array<{ name: string }>): string | null {
  const names = labels.map((l) => l.name.toLowerCase());
  for (const sev of ["critical", "high", "medium", "low"]) {
    if (names.some((n) => n === sev || n === `severity:${sev}` || n === `severity: ${sev}`)) {
      return sev;
    }
  }
  return null;
}

export type PrImportResult =
  | {
      ok: true;
      data: {
        findingTitle: string;
        prRef: string;
        prUrl: string;
        reporterHandle: string | null;
        classRef: string | null;
        severity: string | null;
        rawBodyFirstParagraph: string | null;
      };
    }
  | { ok: false; error: string };

// Minimal, predictable mapping from a fetched PR to the fields our create
// form cares about. Anything we can't extract is null — the caller is
// expected to prompt for or default the missing bits.
export async function importFromPr(rawRef: string): Promise<PrImportResult> {
  const parsed = parsePrRef(rawRef);
  if (!parsed) {
    return {
      ok: false,
      error: "Unrecognised PR reference. Use phantom#32, platform#36, ghost#13, or a full github.com/.../pull/N URL.",
    };
  }
  const pr = await fetchPr(parsed.repo, parsed.number);
  if (!pr) {
    return {
      ok: false,
      error: `Could not fetch ${parsed.repo}#${parsed.number}. Check the ref, and that GITHUB_TOKEN is set if the repo is private.`,
    };
  }
  const firstPara = pr.body
    ? pr.body.split(/\n{2,}/)[0]?.trim().slice(0, 400) ?? null
    : null;
  return {
    ok: true,
    data: {
      findingTitle: pr.title,
      prRef: `${parsed.slug}#${parsed.number}`,
      prUrl: pr.html_url,
      reporterHandle: extractReporter(pr.body),
      classRef: extractClassRef(pr.body, pr.title),
      severity: severityFromLabels(pr.labels),
      rawBodyFirstParagraph: firstPara,
    },
  };
}
