import { describe, it, expect } from "vitest";
import { flagSchema, normalizeFlag } from "@/lib/validation/flags";

describe("flag validation", () => {
  it("accepts canonical FLAG{...} form", () => {
    expect(flagSchema.safeParse("FLAG{ghost_l0_abc123}").success).toBe(true);
  });

  it("accepts lowercase flag{...}", () => {
    expect(flagSchema.safeParse("flag{ghost_l0_abc123}").success).toBe(true);
  });

  it("rejects non-FLAG input", () => {
    expect(flagSchema.safeParse("hunter2").success).toBe(false);
  });

  it("rejects empty", () => {
    expect(flagSchema.safeParse("").success).toBe(false);
  });

  it("rejects > 128 chars", () => {
    expect(flagSchema.safeParse("FLAG{" + "a".repeat(200) + "}").success).toBe(false);
  });

  it("normalizeFlag uppercases prefix and trims whitespace", () => {
    expect(normalizeFlag("  flag{abc}  ")).toBe("FLAG{abc}");
  });
});
