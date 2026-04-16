import { NextRequest, NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter for auth endpoints.
 * Limits: 10 requests per 60 seconds per IP.
 * Resets automatically via Map cleanup.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 300_000);

const RATE_LIMITED_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/sponsors/claim",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate-limit auth-related POST requests
  if (request.method !== "POST") return NextResponse.next();

  const shouldLimit = RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p));
  if (!shouldLimit) return NextResponse.next();

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 },
    );
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
  ],
};
