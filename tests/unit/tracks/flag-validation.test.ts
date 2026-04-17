import { describe, it, expect } from "vitest";
import { flagSchema, normalizeFlag } from "@/lib/validation/flags";

describe("flag validation", () => {
  it("accepts a chain-password style token", () => {
    expect(flagSchema.safeParse("W3lc0m3T0Gh0st").success).toBe(true);
  });

  it("accepts a graduation-style token", () => {
    expect(flagSchema.safeParse("Gh0st_0p3r4t1v3").success).toBe(true);
  });

  it("is case-sensitive (real passwords are)", () => {
    // Both pass length validation — but submit.ts hash lookup will only
    // match the exact canonical casing, which is the game's rule.
    expect(flagSchema.safeParse("w3lc0m3t0gh0st").success).toBe(true);
    expect(flagSchema.safeParse("W3lc0m3T0Gh0st").success).toBe(true);
  });

  it("rejects too-short input", () => {
    expect(flagSchema.safeParse("abc").success).toBe(false);
  });

  it("rejects empty", () => {
    expect(flagSchema.safeParse("").success).toBe(false);
  });

  it("rejects > 128 chars", () => {
    expect(flagSchema.safeParse("a".repeat(200)).success).toBe(false);
  });

  it("normalizeFlag trims whitespace only", () => {
    expect(normalizeFlag("  W3lc0m3T0Gh0st  ")).toBe("W3lc0m3T0Gh0st");
  });

  it("normalizeFlag preserves case", () => {
    expect(normalizeFlag("W3lc0m3T0Gh0st")).toBe("W3lc0m3T0Gh0st");
  });
});
