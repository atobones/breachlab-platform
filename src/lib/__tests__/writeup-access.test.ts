import { describe, expect, it } from "vitest";
import { isTrackOpenForAnyone, isCommunityWriteupReadable } from "../writeup-access";

describe("isTrackOpenForAnyone", () => {
  it("ghost is open", () => {
    expect(isTrackOpenForAnyone("ghost")).toBe(true);
  });
  it("phantom is gated", () => {
    expect(isTrackOpenForAnyone("phantom")).toBe(false);
  });
  it("specter is gated", () => {
    expect(isTrackOpenForAnyone("specter")).toBe(false);
  });
  it("unknown tracks default to gated (fail closed)", () => {
    expect(isTrackOpenForAnyone("future-track")).toBe(false);
  });
});

describe("isCommunityWriteupReadable", () => {
  it("ghost anonymous OK", () => {
    expect(
      isCommunityWriteupReadable({
        trackSlug: "ghost",
        levelIdx: 1,
        user: null,
        completedLevels: new Set(),
      }),
    ).toBe(true);
  });
  it("ghost logged-in OK", () => {
    expect(
      isCommunityWriteupReadable({
        trackSlug: "ghost",
        levelIdx: 5,
        user: { id: "u1", isAdmin: false, isCurator: false } as any,
        completedLevels: new Set(),
      }),
    ).toBe(true);
  });
  it("phantom anonymous blocked", () => {
    expect(
      isCommunityWriteupReadable({
        trackSlug: "phantom",
        levelIdx: 17,
        user: null,
        completedLevels: new Set(),
      }),
    ).toBe(false);
  });
  it("phantom non-completer blocked", () => {
    expect(
      isCommunityWriteupReadable({
        trackSlug: "phantom",
        levelIdx: 17,
        user: { id: "u1", isAdmin: false, isCurator: false } as any,
        completedLevels: new Set([16]),
      }),
    ).toBe(false);
  });
  it("phantom completer of THIS level passes", () => {
    expect(
      isCommunityWriteupReadable({
        trackSlug: "phantom",
        levelIdx: 17,
        user: { id: "u1", isAdmin: false, isCurator: false } as any,
        completedLevels: new Set([17]),
      }),
    ).toBe(true);
  });
  it("curator bypasses gating", () => {
    expect(
      isCommunityWriteupReadable({
        trackSlug: "phantom",
        levelIdx: 17,
        user: { id: "u1", isAdmin: false, isCurator: true } as any,
        completedLevels: new Set(),
      }),
    ).toBe(true);
  });
  it("admin bypasses gating", () => {
    expect(
      isCommunityWriteupReadable({
        trackSlug: "phantom",
        levelIdx: 17,
        user: { id: "u1", isAdmin: true, isCurator: false } as any,
        completedLevels: new Set(),
      }),
    ).toBe(true);
  });
});
