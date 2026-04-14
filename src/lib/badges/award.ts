import type { BadgeKind } from "./types";

export type AwardContext = {
  isFirstBlood: boolean;
  levelId: string;
  trackId: string;
  trackCompleted: boolean;
  isGhostGraduate?: boolean;
  isPhantomGraduate?: boolean;
};

export type BadgeToAward = { kind: BadgeKind; refId: string };

export function decideBadgesToAward(ctx: AwardContext): BadgeToAward[] {
  const out: BadgeToAward[] = [];
  if (ctx.isFirstBlood) out.push({ kind: "first_blood", refId: ctx.levelId });
  if (ctx.trackCompleted)
    out.push({ kind: "track_complete", refId: ctx.trackId });
  if (ctx.isGhostGraduate)
    out.push({ kind: "ghost_graduate", refId: ctx.trackId });
  if (ctx.isPhantomGraduate)
    out.push({ kind: "phantom_master", refId: ctx.trackId });
  return out;
}
