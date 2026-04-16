import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import {
  verifyGitHubSignature,
  parseSponsorshipEvent,
} from "@/lib/webhooks/github-sponsors";

const SECRET = "test-webhook-secret";

function sign(body: string, secret: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyGitHubSignature", () => {
  it("accepts valid signature", () => {
    const body = '{"action":"created"}';
    const sig = sign(body, SECRET);
    expect(verifyGitHubSignature(body, sig, SECRET)).toBe(true);
  });

  it("rejects invalid signature", () => {
    const body = '{"action":"created"}';
    expect(verifyGitHubSignature(body, "sha256=bad", SECRET)).toBe(false);
  });

  it("rejects empty signature", () => {
    expect(verifyGitHubSignature("{}", "", SECRET)).toBe(false);
  });
});

describe("parseSponsorshipEvent", () => {
  it("parses created event with tier", () => {
    const payload = {
      action: "created",
      sponsorship: {
        sponsor: { login: "hacker42", id: 12345 },
        tier: { monthly_price_in_cents: 1000, name: "Operator" },
        created_at: "2026-04-16T00:00:00Z",
      },
    };
    const result = parseSponsorshipEvent(payload);
    expect(result).toEqual({
      action: "created",
      sponsorLogin: "hacker42",
      sponsorGithubId: 12345,
      amountCentsMonthly: 1000,
      tierName: "Operator",
      createdAt: "2026-04-16T00:00:00Z",
    });
  });

  it("parses cancelled event", () => {
    const payload = {
      action: "cancelled",
      sponsorship: {
        sponsor: { login: "hacker42", id: 12345 },
        tier: { monthly_price_in_cents: 1000, name: "Operator" },
        created_at: "2026-04-16T00:00:00Z",
      },
    };
    const result = parseSponsorshipEvent(payload);
    expect(result?.action).toBe("cancelled");
  });

  it("parses tier_changed event", () => {
    const payload = {
      action: "tier_changed",
      sponsorship: {
        sponsor: { login: "hacker42", id: 12345 },
        tier: { monthly_price_in_cents: 2500, name: "Phantom" },
        created_at: "2026-04-16T00:00:00Z",
      },
    };
    const result = parseSponsorshipEvent(payload);
    expect(result?.amountCentsMonthly).toBe(2500);
  });

  it("returns null for unknown actions", () => {
    const payload = { action: "pending_cancellation", sponsorship: {} };
    expect(parseSponsorshipEvent(payload)).toBeNull();
  });
});
