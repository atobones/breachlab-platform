/**
 * IP-to-geo resolver for the live globe.
 *
 * Uses ip-api.com free tier (45 req/min, no key, city-level
 * granularity). Wraps every lookup in an in-memory LRU keyed by IP
 * so a player burst-submitting from the same address doesn't burn
 * the rate limit.
 *
 * Failure modes:
 *  - rate-limit hit → return null, broadcast event without geo
 *  - private/RFC1918 IP (dev) → return null
 *  - lookup error → return null
 *
 * Cache TTL is 24 h: residential IPs change rarely; cellular
 * carriers reassign more often but city-level resolution is
 * stable enough at that timescale.
 */

type GeoResult = {
  lat: number;
  lon: number;
  country?: string;
  city?: string;
};

type CacheEntry = {
  value: GeoResult | null;
  expiresAt: number;
};

const CACHE: Map<string, CacheEntry> = new Map();
const CACHE_MAX = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function isPrivateIp(ip: string): boolean {
  // RFC1918 + loopback + link-local + IPv6 ULA. Skip the lookup
  // for these — the API returns garbage and burns budget.
  return (
    ip === "127.0.0.1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip === "::1" ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.startsWith("fe80")
  );
}

function pruneCache() {
  if (CACHE.size <= CACHE_MAX) return;
  const now = Date.now();
  for (const [k, v] of CACHE) {
    if (v.expiresAt < now) CACHE.delete(k);
    if (CACHE.size <= CACHE_MAX) break;
  }
  // Hard cap fallback: drop oldest insertion if still over.
  while (CACHE.size > CACHE_MAX) {
    const firstKey = CACHE.keys().next().value;
    if (firstKey === undefined) break;
    CACHE.delete(firstKey);
  }
}

export async function resolveIpGeo(
  ip: string | null | undefined
): Promise<GeoResult | null> {
  if (!ip || isPrivateIp(ip)) return null;

  const cached = CACHE.get(ip);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,city,lat,lon`;
    const res = await fetch(url, {
      // Quick timeout so a slow lookup never blocks /submit.
      signal: AbortSignal.timeout(2000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      CACHE.set(ip, { value: null, expiresAt: Date.now() + 60_000 });
      pruneCache();
      return null;
    }
    const data = (await res.json()) as {
      status?: string;
      country?: string;
      countryCode?: string;
      city?: string;
      lat?: number;
      lon?: number;
    };
    if (
      data.status !== "success" ||
      typeof data.lat !== "number" ||
      typeof data.lon !== "number"
    ) {
      CACHE.set(ip, { value: null, expiresAt: Date.now() + 60_000 });
      pruneCache();
      return null;
    }
    const value: GeoResult = {
      lat: data.lat,
      lon: data.lon,
      country: data.countryCode ?? undefined,
      city: data.city ?? undefined,
    };
    CACHE.set(ip, {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    pruneCache();
    return value;
  } catch {
    CACHE.set(ip, { value: null, expiresAt: Date.now() + 60_000 });
    pruneCache();
    return null;
  }
}
