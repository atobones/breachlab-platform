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

function clientIp(request: NextRequest): string {
  // Caddy sets x-real-ip to the real client IP (Cloudflare → Caddy →
  // Next). Prefer it over x-forwarded-for which the client could spoof
  // if the front layer didn't strip it.
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
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

  // ── Rate limits (POST only) ──
  if (request.method !== "POST") return NextResponse.next();

  const ip = clientIp(request);
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
    "/api/sponsors/claim",
    "/api/auth/resend-verification",
    "/admin/:path*",
    "/submit/:path*",
  ],
};
