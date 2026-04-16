export type TierCode = "recruit" | "operator" | "phantom" | "architect";
export type LongevityPin = "30d" | "90d" | "1y" | "2y";

/** Highest tier first — used for display ordering. */
export const TIER_ORDER: TierCode[] = ["architect", "phantom", "operator", "recruit"];

export const TIER_LABEL: Record<TierCode, string> = {
  recruit: "Recruit",
  operator: "Operator",
  phantom: "Phantom",
  architect: "Architect",
};

/** Amount thresholds in cents/month. */
const THRESHOLDS: { min: number; tier: TierCode }[] = [
  { min: 10000, tier: "architect" },
  { min: 2500, tier: "phantom" },
  { min: 1000, tier: "operator" },
  { min: 0, tier: "recruit" },
];

export function computeTier(amountCentsMonthly: number): TierCode {
  for (const { min, tier } of THRESHOLDS) {
    if (amountCentsMonthly >= min) return tier;
  }
  return "recruit";
}

const DAY_MS = 86_400_000;

export function computeLongevityPin(startedAt: Date, now: Date = new Date()): LongevityPin | null {
  const days = Math.floor((now.getTime() - startedAt.getTime()) / DAY_MS);
  if (days >= 730) return "2y";
  if (days >= 365) return "1y";
  if (days >= 90) return "90d";
  if (days >= 30) return "30d";
  return null;
}
