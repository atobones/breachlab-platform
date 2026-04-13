export const PRESETS_USD = [1, 5, 10, 25, 100] as const;
export const CURRENCY_DEFAULT = "USD";
export const MAX_AMOUNT = 10000;

export function validateAmount(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  if (n > MAX_AMOUNT) return null;
  return Math.round(n * 100) / 100;
}
