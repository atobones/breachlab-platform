export const MIN_TRACK_SECONDS: Record<string, number> = {
  ghost: 900,
};

export function minSecondsForTrack(slug: string): number {
  return MIN_TRACK_SECONDS[slug] ?? 0;
}
