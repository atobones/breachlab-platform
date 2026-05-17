import { describe, expect, it } from "vitest";
import { computeWeightedScore } from "../community-writeups";

describe("computeWeightedScore", () => {
  it("regular stars count 1:1", () => {
    expect(computeWeightedScore(3, 0)).toBe(3);
  });
  it("curator stars count 1:1 (badge is separate)", () => {
    expect(computeWeightedScore(0, 1)).toBe(1);
  });
  it("mixed", () => {
    expect(computeWeightedScore(5, 2)).toBe(7);
  });
  it("zero", () => {
    expect(computeWeightedScore(0, 0)).toBe(0);
  });
});
