import type { BadgeKind } from "./types";

export type AwardContext = {
  isFirstBlood: boolean;
  levelId: string;
  trackId: string;
  trackCompleted: boolean;
};

export type BadgeToAward = { kind: BadgeKind; refId: string };

export function decideBadgesToAward(ctx: AwardContext): BadgeToAward[] {
  const out: BadgeToAward[] = [];
  if (ctx.isFirstBlood) out.push({ kind: "first_blood", refId: ctx.levelId });
  if (ctx.trackCompleted)
    out.push({ kind: "track_complete", refId: ctx.trackId });
  return out;
}
