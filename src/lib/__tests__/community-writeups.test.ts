import { describe, expect, it } from "vitest";
import { computeWeightedScore } from "../community-writeups";

describe("computeWeightedScore", () => {
  it("regular star = 1", () => {
    expect(computeWeightedScore(3, 0)).toBe(3);
  });
  it("curator star = 10", () => {
    expect(computeWeightedScore(0, 1)).toBe(10);
  });
  it("mixed", () => {
    expect(computeWeightedScore(5, 2)).toBe(25);
  });
  it("zero", () => {
    expect(computeWeightedScore(0, 0)).toBe(0);
  });
});
