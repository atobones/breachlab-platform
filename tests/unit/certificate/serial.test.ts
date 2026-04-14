import { describe, it, expect } from "vitest";
import { operativeSerial, operativeSeal } from "@/lib/certificate/serial";

const U = "11111111-1111-1111-1111-111111111111";
const T = "22222222-2222-2222-2222-222222222222";
const DATE = new Date("2026-04-14T00:00:00.000Z");

describe("operativeSerial", () => {
  it("is deterministic for the same triple", () => {
    expect(operativeSerial(U, T, DATE)).toBe(operativeSerial(U, T, DATE));
  });

  it("matches GHST-XXXX-XXXX-XXXX format", () => {
    expect(operativeSerial(U, T, DATE)).toMatch(/^GHST-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it("differs when userId differs", () => {
    const a = operativeSerial(U, T, DATE);
    const b = operativeSerial("99999999-9999-9999-9999-999999999999", T, DATE);
    expect(a).not.toBe(b);
  });

  it("differs when awardedAt differs", () => {
    const a = operativeSerial(U, T, DATE);
    const b = operativeSerial(U, T, new Date("2027-01-01T00:00:00.000Z"));
    expect(a).not.toBe(b);
  });
});

describe("operativeSeal", () => {
  it("returns 5 lines of 5 chars", () => {
    const seal = operativeSeal("GHST-ABCD-1234-5678");
    expect(seal).toHaveLength(5);
    for (const line of seal) expect(line).toHaveLength(5);
  });

  it("is deterministic", () => {
    expect(operativeSeal("GHST-AAAA-BBBB-CCCC")).toEqual(
      operativeSeal("GHST-AAAA-BBBB-CCCC"),
    );
  });
});
