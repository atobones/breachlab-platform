import { describe, it, expect } from "vitest";
import { isBadgeKind, BADGE_LABEL } from "@/lib/badges/types";

describe("badge types", () => {
  it("recognizes known kinds", () => {
    expect(isBadgeKind("first_blood")).toBe(true);
    expect(isBadgeKind("track_complete")).toBe(true);
    expect(isBadgeKind("supporter")).toBe(true);
    expect(isBadgeKind("speedrun_top10")).toBe(true);
  });

  it("rejects unknown kinds", () => {
    expect(isBadgeKind("hacker_deluxe")).toBe(false);
    expect(isBadgeKind("")).toBe(false);
  });

  it("labels first_blood as 'First Blood'", () => {
    expect(BADGE_LABEL.first_blood).toBe("First Blood");
  });

  it("labels track_complete as 'Track Complete'", () => {
    expect(BADGE_LABEL.track_complete).toBe("Track Complete");
  });
});
