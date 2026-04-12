import { describe, it, expect } from "vitest";
import {
  generateToken,
  hashToken,
  TOKEN_LENGTH_BYTES,
} from "@/lib/auth/tokens";

describe("tokens", () => {
  it("generates a URL-safe token of expected length", () => {
    const token = generateToken();
    expect(token).toBeTypeOf("string");
    expect(token.length).toBeGreaterThan(0);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates different tokens on each call", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });

  it("hashToken returns a deterministic 64-char hex sha256", async () => {
    const h1 = await hashToken("hello");
    const h2 = await hashToken("hello");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hashToken returns different hashes for different inputs", async () => {
    expect(await hashToken("a")).not.toBe(await hashToken("b"));
  });

  it("exposes a sane TOKEN_LENGTH_BYTES constant", () => {
    expect(TOKEN_LENGTH_BYTES).toBeGreaterThanOrEqual(32);
  });
});
