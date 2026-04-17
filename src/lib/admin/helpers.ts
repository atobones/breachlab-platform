import { computeTier, type TierCode } from "@/lib/sponsors/tiers";

export type SponsorRollup = {
  activeCount: number;
  mrrCents: number;
  byTier: Record<TierCode, number>;
  bySource: Record<string, number>;
};

export function rollupSponsors(
  rows: { amount: number; source: string }[]
): SponsorRollup {
  const byTier: Record<TierCode, number> = {
    recruit: 0,
    operator: 0,
    phantom: 0,
    architect: 0,
  };
  const bySource: Record<string, number> = {};
  let mrrCents = 0;
  for (const r of rows) {
    const amount = Number(r.amount) || 0;
    mrrCents += amount;
    byTier[computeTier(amount)]++;
    bySource[r.source] = (bySource[r.source] ?? 0) + 1;
  }
  return {
    activeCount: rows.length,
    mrrCents,
    byTier,
    bySource,
  };
}

export type DailyTrendPoint = {
  day: string; // YYYY-MM-DD
  registrations: number;
  submissions: number;
};

export function mergeDailyTrend(
  regRows: Array<{ day: string; c: number }> | readonly unknown[],
  subRows: Array<{ day: string; c: number }> | readonly unknown[],
  days: number
): DailyTrendPoint[] {
  const regMap = new Map<string, number>();
  const subMap = new Map<string, number>();
  for (const r of regRows as Array<{ day: string; c: number }>) {
    regMap.set(r.day, Number(r.c));
  }
  for (const r of subRows as Array<{ day: string; c: number }>) {
    subMap.set(r.day, Number(r.c));
  }

  const out: DailyTrendPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      day: key,
      registrations: regMap.get(key) ?? 0,
      submissions: subMap.get(key) ?? 0,
    });
  }
  return out;
}
