import { describe, it, expect } from "vitest";
import { safeBearerMatch } from "@/lib/auth/tokens";

describe("safeBearerMatch", () => {
  const SECRET = "s3cret-token-XYZ-12345";

  it("accepts the exact bearer token", () => {
    expect(safeBearerMatch(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("rejects a different token of the same length", () => {
    const wrong = SECRET.split("").reverse().join("");
    expect(wrong).toHaveLength(SECRET.length);
    expect(safeBearerMatch(`Bearer ${wrong}`, SECRET)).toBe(false);
  });

  it("rejects a token that differs only in the last byte", () => {
    const almost = SECRET.slice(0, -1) + (SECRET.slice(-1) === "0" ? "1" : "0");
    expect(safeBearerMatch(`Bearer ${almost}`, SECRET)).toBe(false);
  });

  it("rejects mismatched lengths", () => {
    expect(safeBearerMatch(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(safeBearerMatch(`Bearer ${SECRET.slice(0, -1)}`, SECRET)).toBe(false);
  });

  it("rejects missing Bearer prefix", () => {
    expect(safeBearerMatch(SECRET, SECRET)).toBe(false);
    expect(safeBearerMatch(`Token ${SECRET}`, SECRET)).toBe(false);
  });

  it("rejects null / empty headers", () => {
    expect(safeBearerMatch(null, SECRET)).toBe(false);
    expect(safeBearerMatch(undefined, SECRET)).toBe(false);
    expect(safeBearerMatch("", SECRET)).toBe(false);
  });

  it("rejects when expected secret is missing", () => {
    expect(safeBearerMatch(`Bearer ${SECRET}`, null)).toBe(false);
    expect(safeBearerMatch(`Bearer ${SECRET}`, "")).toBe(false);
  });

  it("handles unicode tokens correctly", () => {
    const u = "пиши-шифром-🔐-42";
    expect(safeBearerMatch(`Bearer ${u}`, u)).toBe(true);
    expect(safeBearerMatch(`Bearer ${u}!`, u)).toBe(false);
  });
});
