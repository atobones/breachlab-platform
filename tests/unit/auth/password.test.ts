import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password", () => {
  it("hashes a password to a non-empty string different from input", async () => {
    const hash = await hashPassword("hunter2");
    expect(hash).toBeTypeOf("string");
    expect(hash.length).toBeGreaterThan(0);
    expect(hash).not.toBe("hunter2");
  });

  it("verifies a correct password", async () => {
    const hash = await hashPassword("hunter2");
    expect(await verifyPassword(hash, "hunter2")).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("hunter2");
    expect(await verifyPassword(hash, "wrong")).toBe(false);
  });
});
