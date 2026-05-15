import { getHourlyHeartbeat } from "@/lib/leaderboard/queries";

// Unicode block-element ramp — same width as a monospace cell, so the
// sparkline aligns to the surrounding `[ BRACKETS ]` glyphs.
const RAMP = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;

function toBlocks(counts: number[]): string {
  const max = Math.max(1, ...counts);
  return counts
    .map((c) => {
      if (c === 0) return RAMP[0];
      const idx = Math.min(
        RAMP.length - 1,
        Math.max(1, Math.round((c / max) * (RAMP.length - 1))),
      );
      return RAMP[idx];
    })
    .join("");
}

export async function Heartbeat() {
  const counts = await getHourlyHeartbeat(24);
  const total = counts.reduce((a, b) => a + b, 0);
  const peak = Math.max(...counts);
  return (
    <div className="border border-amber/20 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-amber">[ HEARTBEAT · 24h ]</span>
        <span className="text-muted tabular-nums">
          {total} solves · peak {peak}/h
        </span>
      </div>
      <div className="font-mono text-amber text-base leading-none tracking-tight tabular-nums">
        {toBlocks(counts)}
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>24h ago</span>
        <span>now</span>
      </div>
    </div>
  );
}
