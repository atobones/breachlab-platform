// Shared formatter for speedrun run totals. Always HH:MM:SS so a 4-hour
// Ghost run reads as "04:28:41" instead of "268:41". Used by the leaderboard
// table, profile page and admin review queue.
export function formatHhMmSs(totalSeconds: number | null): string {
  if (totalSeconds === null) return "—";
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
