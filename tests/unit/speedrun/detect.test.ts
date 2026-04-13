import { describe, it, expect } from "vitest";
import { isSuspicious } from "@/lib/speedrun/hooks";

describe("isSuspicious", () => {
  it("returns true when totalSeconds < minSeconds", () => {
    expect(isSuspicious({ totalSeconds: 500, minSeconds: 900 })).toBe(true);
  });

  it("returns false when totalSeconds equals minSeconds", () => {
    expect(isSuspicious({ totalSeconds: 900, minSeconds: 900 })).toBe(false);
  });

  it("returns false when totalSeconds > minSeconds", () => {
    expect(isSuspicious({ totalSeconds: 1200, minSeconds: 900 })).toBe(false);
  });

  it("treats minSeconds=0 as never suspicious for non-negative totals", () => {
    expect(isSuspicious({ totalSeconds: 0, minSeconds: 0 })).toBe(false);
    expect(isSuspicious({ totalSeconds: 5, minSeconds: 0 })).toBe(false);
  });
});
