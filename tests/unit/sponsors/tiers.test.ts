import { describe, it, expect } from "vitest";
import {
  computeTier,
  computeLongevityPin,
  TIER_ORDER,
  TIER_LABEL,
} from "@/lib/sponsors/tiers";

describe("computeTier", () => {
  it("returns recruit for $3/mo", () => {
    expect(computeTier(300)).toBe("recruit");
  });

  it("returns operator for $10/mo", () => {
    expect(computeTier(1000)).toBe("operator");
  });

  it("returns phantom for $25/mo", () => {
    expect(computeTier(2500)).toBe("phantom");
  });

  it("returns architect for $100/mo", () => {
    expect(computeTier(10000)).toBe("architect");
  });

  it("returns architect for amounts above $100", () => {
    expect(computeTier(50000)).toBe("architect");
  });

  it("returns recruit for amounts between $3 and $10", () => {
    expect(computeTier(500)).toBe("recruit");
  });

  it("returns recruit for amounts below $3", () => {
    expect(computeTier(100)).toBe("recruit");
  });
});

describe("computeLongevityPin", () => {
  const now = new Date("2026-04-16T00:00:00Z");

  it("returns null for less than 30 days", () => {
    const start = new Date("2026-04-01T00:00:00Z");
    expect(computeLongevityPin(start, now)).toBeNull();
  });

  it("returns '30d' for 30-89 days", () => {
    const start = new Date("2026-03-01T00:00:00Z");
    expect(computeLongevityPin(start, now)).toBe("30d");
  });

  it("returns '90d' for 90-364 days", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    expect(computeLongevityPin(start, now)).toBe("90d");
  });

  it("returns '1y' for 365-729 days", () => {
    const start = new Date("2025-04-01T00:00:00Z");
    expect(computeLongevityPin(start, now)).toBe("1y");
  });

  it("returns '2y' for 730+ days", () => {
    const start = new Date("2024-01-01T00:00:00Z");
    expect(computeLongevityPin(start, now)).toBe("2y");
  });
});

describe("TIER_ORDER", () => {
  it("orders architect > phantom > operator > recruit", () => {
    expect(TIER_ORDER).toEqual(["architect", "phantom", "operator", "recruit"]);
  });
});

describe("TIER_LABEL", () => {
  it("has labels for all tiers", () => {
    expect(TIER_LABEL.recruit).toBe("Recruit");
    expect(TIER_LABEL.operator).toBe("Operator");
    expect(TIER_LABEL.phantom).toBe("Phantom");
    expect(TIER_LABEL.architect).toBe("Architect");
  });
});
