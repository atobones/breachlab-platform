import { describe, it, expect } from "vitest";
import { minSecondsForTrack } from "@/lib/speedrun/thresholds";

describe("minSecondsForTrack", () => {
  it("returns 900 for ghost", () => {
    expect(minSecondsForTrack("ghost")).toBe(900);
  });

  it("returns 0 for unknown tracks", () => {
    expect(minSecondsForTrack("unknown")).toBe(0);
  });
});
