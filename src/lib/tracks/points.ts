export type LevelPoints = {
  pointsBase: number;
  pointsFirstBloodBonus: number;
};

export function computeAwardedPoints(
  level: LevelPoints,
  isFirstBlood: boolean
): number {
  const base = Math.max(0, level.pointsBase);
  if (!isFirstBlood) return base;
  const bonus = Math.max(0, level.pointsFirstBloodBonus);
  return base + bonus;
}
