import { describe, it, expect } from "vitest";
import { computeAwardedPoints } from "@/lib/tracks/points";

describe("computeAwardedPoints", () => {
  it("returns base when not first blood", () => {
    expect(
      computeAwardedPoints({ pointsBase: 100, pointsFirstBloodBonus: 50 }, false)
    ).toBe(100);
  });

  it("adds first blood bonus when first blood", () => {
    expect(
      computeAwardedPoints({ pointsBase: 100, pointsFirstBloodBonus: 50 }, true)
    ).toBe(150);
  });

  it("clamps negative base to zero", () => {
    expect(
      computeAwardedPoints({ pointsBase: -10, pointsFirstBloodBonus: 50 }, false)
    ).toBe(0);
  });
});
