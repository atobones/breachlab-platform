// Minimum plausible track-completion seconds. Runs faster than this are
// flagged is_suspicious=true at close time and surface in /admin/review.
// Calibrated on speedrun philosophy: "nobody legitimately finishes this
// in under N seconds". Ghost has 16 levels of Linux recon + simple
// privesc, 15min is aggressive but possible. Phantom has 30 levels
// across three Acts (BOF, privesc, container/cloud), 60min is the
// floor for a prepared operator who already knows the solves.
export const MIN_TRACK_SECONDS: Record<string, number> = {
  ghost: 900,
  phantom: 3600,
};

export function minSecondsForTrack(slug: string): number {
  return MIN_TRACK_SECONDS[slug] ?? 0;
}
