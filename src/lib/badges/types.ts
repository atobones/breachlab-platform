export type BadgeKind =
  | "first_blood"
  | "track_complete"
  | "supporter"
  | "speedrun_top10"
  | "ghost_graduate"
  | "phantom_master"
  | "sponsor_recruit"
  | "sponsor_operator"
  | "sponsor_phantom"
  | "sponsor_architect";

const KINDS = new Set<BadgeKind>([
  "first_blood",
  "track_complete",
  "supporter",
  "speedrun_top10",
  "ghost_graduate",
  "phantom_master",
  "sponsor_recruit",
  "sponsor_operator",
  "sponsor_phantom",
  "sponsor_architect",
]);

export function isBadgeKind(value: string): value is BadgeKind {
  return KINDS.has(value as BadgeKind);
}

export const BADGE_LABEL: Record<BadgeKind, string> = {
  first_blood: "First Blood",
  track_complete: "Track Complete",
  supporter: "Supporter",
  speedrun_top10: "Speedrun Top 10",
  ghost_graduate: "Ghost Graduate",
  phantom_master: "Phantom Operative",
  sponsor_recruit: "Recruit Sponsor",
  sponsor_operator: "Operator Sponsor",
  sponsor_phantom: "Phantom Sponsor",
  sponsor_architect: "Architect Sponsor",
};
