import { describe, it, expect } from "vitest";
import { computeExpectedRoles } from "@/lib/discord/roles";

const IDS = { supporter: "S", firstBlood: "F", ghostMaster: "G" };

describe("computeExpectedRoles", () => {
  it("returns empty when nothing applies", () => {
    expect(
      computeExpectedRoles(
        { isSupporter: false, hasFirstBlood: false, hasTrackComplete: false },
        IDS,
      ),
    ).toEqual([]);
  });

  it("adds supporter role when supporter", () => {
    expect(
      computeExpectedRoles(
        { isSupporter: true, hasFirstBlood: false, hasTrackComplete: false },
        IDS,
      ),
    ).toEqual(["S"]);
  });

  it("adds all roles when all apply", () => {
    expect(
      computeExpectedRoles(
        { isSupporter: true, hasFirstBlood: true, hasTrackComplete: true },
        IDS,
      ),
    ).toEqual(["S", "F", "G"]);
  });

  it("skips roles whose id is null (not configured)", () => {
    expect(
      computeExpectedRoles(
        { isSupporter: true, hasFirstBlood: true, hasTrackComplete: true },
        { supporter: null, firstBlood: "F", ghostMaster: null },
      ),
    ).toEqual(["F"]);
  });

  it("skips unset role ids even when conditions met", () => {
    expect(
      computeExpectedRoles(
        { isSupporter: true, hasFirstBlood: false, hasTrackComplete: true },
        { supporter: null, firstBlood: null, ghostMaster: null },
      ),
    ).toEqual([]);
  });
});
