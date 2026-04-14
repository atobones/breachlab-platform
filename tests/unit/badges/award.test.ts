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

  it("awards ghost_graduate when isGhostGraduate", () => {
    const badges = decideBadgesToAward({
      isFirstBlood: false,
      levelId: "lvl-22",
      trackId: "trk-ghost",
      trackCompleted: false,
      isGhostGraduate: true,
    });
    expect(badges).toEqual([{ kind: "ghost_graduate", refId: "trk-ghost" }]);
  });

  it("omits ghost_graduate when flag is false", () => {
    const badges = decideBadgesToAward({
      isFirstBlood: false,
      levelId: "lvl-22",
      trackId: "trk-ghost",
      trackCompleted: false,
      isGhostGraduate: false,
    });
    expect(badges).toEqual([]);
  });

  it("awards first blood + track complete + graduate together", () => {
    const badges = decideBadgesToAward({
      isFirstBlood: true,
      levelId: "lvl-22",
      trackId: "trk-ghost",
      trackCompleted: true,
      isGhostGraduate: true,
    });
    expect(badges).toHaveLength(3);
    expect(badges).toContainEqual({ kind: "first_blood", refId: "lvl-22" });
    expect(badges).toContainEqual({ kind: "track_complete", refId: "trk-ghost" });
    expect(badges).toContainEqual({ kind: "ghost_graduate", refId: "trk-ghost" });
  });

  it("awards phantom_master when isPhantomGraduate", () => {
    const badges = decideBadgesToAward({
      isFirstBlood: false,
      levelId: "lvl-20",
      trackId: "trk-phantom",
      trackCompleted: false,
      isPhantomGraduate: true,
    });
    expect(badges).toEqual([{ kind: "phantom_master", refId: "trk-phantom" }]);
  });

  it("omits phantom_master when flag is false", () => {
    const badges = decideBadgesToAward({
      isFirstBlood: false,
      levelId: "lvl-20",
      trackId: "trk-phantom",
      trackCompleted: false,
      isPhantomGraduate: false,
    });
    expect(badges).toEqual([]);
  });

  it("ghost and phantom graduate flags are independent", () => {
    const badges = decideBadgesToAward({
      isFirstBlood: false,
      levelId: "lvl-20",
      trackId: "trk-phantom",
      trackCompleted: true,
      isGhostGraduate: false,
      isPhantomGraduate: true,
    });
    expect(badges).toHaveLength(2);
    expect(badges).toContainEqual({ kind: "track_complete", refId: "trk-phantom" });
    expect(badges).toContainEqual({ kind: "phantom_master", refId: "trk-phantom" });
  });
});
