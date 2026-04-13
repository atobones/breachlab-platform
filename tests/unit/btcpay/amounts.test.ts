import { describe, it, expect } from "vitest";
import { validateAmount, PRESETS_USD, MAX_AMOUNT } from "@/lib/btcpay/amounts";

describe("validateAmount", () => {
  it("accepts presets", () => {
    for (const p of PRESETS_USD) {
      expect(validateAmount(p)).toBe(p);
    }
  });

  it("accepts string numbers", () => {
    expect(validateAmount("5")).toBe(5);
    expect(validateAmount("5.50")).toBe(5.5);
  });

  it("rounds to cents", () => {
    expect(validateAmount(1.999)).toBe(2);
    expect(validateAmount(1.994)).toBe(1.99);
  });

  it("rejects zero and negative", () => {
    expect(validateAmount(0)).toBeNull();
    expect(validateAmount(-1)).toBeNull();
  });

  it("rejects non-numeric", () => {
    expect(validateAmount("abc")).toBeNull();
    expect(validateAmount(NaN)).toBeNull();
    expect(validateAmount(null)).toBeNull();
    expect(validateAmount(undefined)).toBeNull();
  });

  it(`rejects over ${MAX_AMOUNT}`, () => {
    expect(validateAmount(MAX_AMOUNT + 1)).toBeNull();
    expect(validateAmount(MAX_AMOUNT)).toBe(MAX_AMOUNT);
  });
});
