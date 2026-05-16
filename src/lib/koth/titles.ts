// Title ladder — derived from lifetime round wins. Renders everywhere
// a player's username appears: leaderboard, history, kill-feed, the
// Crown Champions panel. Gives the grind a concrete target instead of
// arbitrary point counts.
//
// Thresholds are picked so the ladder feels reachable in the first
// month (1 win = title) but the top rungs require months of play
// (50+ wins ≈ 1.5 rounds/day for a month given a 30-min cycle).
// We'll recalibrate after the first cohort plays a week.

export type CrownTitle = {
  slug: string;       // machine identifier
  label: string;      // shown to humans, ALL-CAPS by convention
  minWins: number;    // inclusive lower bound
  color: string;      // tailwind text-color class
  glyph: string;      // single-char/glyph used in compact contexts
};

export const TITLE_LADDER: ReadonlyArray<CrownTitle> = [
  { slug: "warlord",   label: "WARLORD",   minWins: 50, color: "text-red-400",       glyph: "✦" },
  { slug: "predator",  label: "PREDATOR",  minWins: 20, color: "text-amber",         glyph: "◆" },
  { slug: "hunter",    label: "HUNTER",    minWins: 5,  color: "text-amber/80",      glyph: "◆" },
  { slug: "operative", label: "OPERATIVE", minWins: 1,  color: "text-green/80",      glyph: "◇" },
];

// Highest title for which the player meets the threshold. null = no
// title yet (zero round wins). Sorted descending by minWins so the
// first match wins.
export function titleFromRoundWins(roundWins: number): CrownTitle | null {
  for (const t of TITLE_LADDER) {
    if (roundWins >= t.minWins) return t;
  }
  return null;
}

// Distance to the next rung — used on profile / hover cards to render
// "12 more wins → HUNTER". Returns null if already at top.
export function nextTitleProgress(
  roundWins: number,
): { current: CrownTitle | null; next: CrownTitle; toGo: number } | null {
  const current = titleFromRoundWins(roundWins);
  // Find the next higher rung. TITLE_LADDER is descending so the next
  // rung is the one immediately before current in iteration order.
  let next: CrownTitle | null = null;
  for (const t of TITLE_LADDER) {
    if (roundWins >= t.minWins) break;
    next = t;
  }
  if (!next) return null;
  return { current, next, toGo: next.minWins - roundWins };
}
