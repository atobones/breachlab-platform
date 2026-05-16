import { NextRequest, NextResponse } from "next/server";

/**
 * In-memory rate limiter for auth endpoints and admin mutations.
 *
 * One bucket per (path-group, ip), keyed by "group:ip". State resets on
 * container restart — acceptable for a single-replica deploy. If this
 * ever runs behind multiple replicas, move to Redis/Postgres.
 */
type Bucket = { count: number; resetAt: number };
const rateLimitMap = new Map<string, Bucket>();

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  return entry.count > limit;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(k);
  }
}, 300_000);

// Groups with independent windows + limits. Tuning rationale:
// - auth: legitimate humans type ≤10 times/min, bots script much faster.
// - admin: a human clicks ≤60 buttons/min; a runaway script or stolen
//          session would burst well past that.
const GROUPS: Array<{
  name: string;
  paths: string[];
  limit: number;
  windowMs: number;
}> = [
  {
    name: "auth",
    paths: [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/api/sponsors/claim",
      "/api/auth/resend-verification",
    ],
    limit: 10,
    windowMs: 60_000,
  },
  {
    name: "admin",
    paths: ["/admin"],
    limit: 60,
    windowMs: 60_000,
  },
  {
    // Flag submissions — without this, the endpoint is brute-forceable:
    // a script can iterate the flag-value space (or replay a partial
    // hint) at line speed. Legitimate humans solve at most a few per
    // hour; 30/min is generous for a frantic typo-correction streak
    // but kills any meaningful brute-force.
    name: "submit",
    paths: ["/submit"],
    limit: 30,
    windowMs: 60_000,
  },
];

// Global per-IP cap on /api/* — applies to BOTH GET and POST (different
// from the POST-only groups above). Blocks generic API flooding that
// would saturate the web container under the same kind of vector
// mustafa demonstrated against ssh (just at HTTP layer instead).
//
// /api/live/events is SSE (one long-lived connection per page) — exempt
// from this cap; abusing SSE looks like concurrent-connections, not
// requests/min, and is bounded by Cloudflare/Caddy connection limits.
const API_GLOBAL_LIMIT = 60;
const API_GLOBAL_WINDOW_MS = 60_000;
const API_EXEMPT_PREFIXES = [
  "/api/live/events",  // SSE stream
  "/api/health",       // monitoring probe
];

function clientIp(request: NextRequest): string {
  // Caddy always sets x-real-ip for external traffic (Cloudflare → Caddy →
  // web container). A legitimate request can never lack it. We
  // deliberately DO NOT fall back to x-forwarded-for: that header is
  // attacker-controlled (client-supplied, Caddy forwards it as-is),
  // and a fallback there lets anyone spoof their rate-limit bucket by
  // putting a unique X-Forwarded-For value on every request, effectively
  // getting unlimited /submit brute-force attempts. Reported 2026-04-20.
  //
  // If x-real-ip is missing we collapse all such requests onto a single
  // "no-x-real-ip" bucket — legit traffic never hits this path, so the
  // bucket being contended is a feature, not a bug.
  return request.headers.get("x-real-ip") ?? "no-x-real-ip";
}

// Optional IP allowlist for /admin: comma-separated IPs via env. Unset =
// no IP restriction (auth + TOTP still apply). Set = anyone outside the
// list gets a hard 404 on every /admin request (so the panel's existence
// isn't even disclosed from the wrong network).
function adminIpAllowlist(): Set<string> | null {
  const raw = process.env.ADMIN_IP_ALLOWLIST;
  if (!raw) return null;
  const ips = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ips.length === 0 ? null : new Set(ips);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── /admin IP allowlist (applies to GET and POST) ──
  if (pathname.startsWith("/admin")) {
    const allow = adminIpAllowlist();
    if (allow && !allow.has(clientIp(request))) {
      // 404 not 403 — don't tell the wrong network that /admin exists.
      return new NextResponse(null, { status: 404 });
    }
  }

  const ip = clientIp(request);

  // ── Global /api/* cap (all methods) — generic flood defense ──
  if (
    pathname.startsWith("/api/") &&
    !API_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    if (
      isRateLimited(`api:${ip}`, API_GLOBAL_LIMIT, API_GLOBAL_WINDOW_MS)
    ) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 },
      );
    }
  }

  // ── POST-only group caps (auth/admin/submit) ──
  if (request.method !== "POST") return NextResponse.next();

  for (const g of GROUPS) {
    if (!g.paths.some((p) => pathname.startsWith(p))) continue;
    if (isRateLimited(`${g.name}:${ip}`, g.limit, g.windowMs)) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }
    break;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login/:path*",
    "/register/:path*",
    "/forgot-password/:path*",
    "/reset-password/:path*",
    "/admin/:path*",
    "/submit/:path*",
    // /api/* — broad match for the global cap. Specific POST-only
    // groups above (sponsors/claim, resend-verification) still match
    // these patterns but are gated by the method check.
    "/api/:path*",
  ],
};
