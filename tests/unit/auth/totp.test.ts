import { describe, it, expect } from "vitest";
import {
  generateTotpSecret,
  totpUri,
  verifyTotp,
  generateTotpAtTime,
} from "@/lib/auth/totp";

describe("totp", () => {
  it("generates a base32 secret", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]+=*$/);
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });

  it("builds an otpauth:// URI for a given user", () => {
    const uri = totpUri("alice", "JBSWY3DPEHPK3PXP");
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("alice");
    expect(uri).toContain("BreachLab");
    expect(uri).toContain("secret=JBSWY3DPEHPK3PXP");
  });

  it("accepts a code generated for the same secret and time", async () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const code = await generateTotpAtTime(secret, now);
    expect(await verifyTotp(secret, code, now)).toBe(true);
  });

  it("rejects a wrong code", async () => {
    const secret = generateTotpSecret();
    expect(await verifyTotp(secret, "000000", Date.now())).toBe(false);
  });
});
