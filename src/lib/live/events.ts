export type SubmissionEvent = {
  type: "submission";
  at: string;
  username: string;
  isHallOfFame?: boolean;
  trackSlug: string;
  levelIdx: number;
  levelTitle: string;
  // Geo enrichment for the live globe. City-level granularity only —
  // no precise coords, no IP, no PII beyond country/city. Optional
  // because IP-resolution can fail (free-tier rate limits, private
  // IPs in dev, opted-out users).
  geo?: {
    lat: number;
    lon: number;
    country?: string;  // ISO 3166-1 alpha-2 (e.g. "US")
    city?: string;
  };
};

export type LiveEvent = SubmissionEvent;
