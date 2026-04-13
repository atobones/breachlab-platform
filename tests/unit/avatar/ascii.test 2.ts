import { describe, it, expect } from "vitest";
import { asciiAvatar } from "@/lib/avatar/ascii";

const SAFE = new Set([" ", "#", "*", "+", ".", "/", "\\", "|", "-"]);

describe("asciiAvatar", () => {
  it("is deterministic for the same username", () => {
    expect(asciiAvatar("ghost0")).toEqual(asciiAvatar("ghost0"));
  });

  it("returns 6 lines of 7 chars each", () => {
    const out = asciiAvatar("testuser");
    expect(out).toHaveLength(6);
    for (const line of out) {
      expect(line).toHaveLength(7);
    }
  });

  it("uses only chars from the safe palette", () => {
    const out = asciiAvatar("another");
    for (const line of out) {
      for (const ch of line) {
        expect(SAFE.has(ch)).toBe(true);
      }
    }
  });

  it("produces different output for different usernames", () => {
    expect(asciiAvatar("alice")).not.toEqual(asciiAvatar("bob"));
    expect(asciiAvatar("alice")).not.toEqual(asciiAvatar("alicia"));
  });
});
