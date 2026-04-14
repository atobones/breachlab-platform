import { describe, it, expect } from "vitest";
import { computeExpectedRoles } from "@/lib/discord/roles";

const IDS = {
  operative: "O",
  supporter: "S",
  firstBlood: "F",
  ghostMaster: "G",
  phantomOperative: "P",
};

const BASE = {
  isSupporter: false,
  hasFirstBlood: false,
  hasTrackComplete: false,
  hasGhostGraduate: false,
  hasPhantomMaster: false,
};

describe("computeExpectedRoles", () => {
  it("always grants Operative when linked (baseline)", () => {
    expect(computeExpectedRoles(BASE, IDS)).toEqual(["O"]);
  });

  it("adds supporter on top of operative", () => {
    expect(
      computeExpectedRoles({ ...BASE, isSupporter: true }, IDS),
    ).toEqual(["O", "S"]);
  });

  it("adds ghost_graduate → Ghost Master", () => {
    expect(
      computeExpectedRoles({ ...BASE, hasGhostGraduate: true }, IDS),
    ).toEqual(["O", "G"]);
  });

  it("adds phantom_master → Phantom Operative", () => {
    expect(
      computeExpectedRoles({ ...BASE, hasPhantomMaster: true }, IDS),
    ).toEqual(["O", "P"]);
  });

  it("stacks all roles when everything applies", () => {
    const roles = computeExpectedRoles(
      {
        isSupporter: true,
        hasFirstBlood: true,
        hasTrackComplete: true,
        hasGhostGraduate: true,
        hasPhantomMaster: true,
      },
      IDS,
    );
    expect(roles).toHaveLength(5);
    expect(roles).toContain("O");
    expect(roles).toContain("S");
    expect(roles).toContain("F");
    expect(roles).toContain("G");
    expect(roles).toContain("P");
  });

  it("skips roles whose id is null", () => {
    expect(
      computeExpectedRoles(
        { ...BASE, isSupporter: true },
        { ...IDS, operative: null, supporter: null },
      ),
    ).toEqual([]);
  });
});
