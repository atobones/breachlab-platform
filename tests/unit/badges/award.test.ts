import { describe, it, expect } from "vitest";
import { decideBadgesToAward } from "@/lib/badges/award";

describe("decideBadgesToAward", () => {
  it("awards first_blood when isFirstBlood is true", () => {
    const badges = decideBadgesToAward({
      isFirstBlood: true,
      levelId: "lvl-1",
      trackId: "trk-1",
      trackCompleted: false,
    });
    expect(badges).toEqual([{ kind: "first_blood", refId: "lvl-1" }]);
  });

  it("awards track_complete when trackCompleted", () => {
    const badges = decideBadgesToAward({
      isFirstBlood: false,
      levelId: "lvl-9",
      trackId: "trk-1",
      trackCompleted: true,
    });
    expect(badges).toEqual([{ kind: "track_complete", refId: "trk-1" }]);
  });

  it("awards both when first blood AND track complete", () => {
    const badges = decideBadgesToAward({
      isFirstBlood: true,
      levelId: "lvl-9",
      trackId: "trk-1",
      trackCompleted: true,
    });
    expect(badges).toHaveLength(2);
    expect(badges).toContainEqual({ kind: "first_blood", refId: "lvl-9" });
    expect(badges).toContainEqual({ kind: "track_complete", refId: "trk-1" });
  });

  it("awards nothing when neither", () => {
    expect(
      decideBadgesToAward({
        isFirstBlood: false,
        levelId: "lvl-1",
        trackId: "trk-1",
        trackCompleted: false,
      })
    ).toEqual([]);
  });
});
