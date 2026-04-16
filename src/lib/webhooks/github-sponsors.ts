import { createHmac, timingSafeEqual } from "crypto";

export function verifyGitHubSignature(
  body: string,
  signatureHeader: string,
  secret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== signatureHeader.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

export type SponsorshipEvent = {
  action: "created" | "cancelled" | "tier_changed";
  sponsorLogin: string;
  sponsorGithubId: number;
  amountCentsMonthly: number;
  tierName: string;
  createdAt: string;
};

const HANDLED_ACTIONS = new Set(["created", "cancelled", "tier_changed"]);

export function parseSponsorshipEvent(
  payload: Record<string, unknown>,
): SponsorshipEvent | null {
  const action = payload.action as string;
  if (!HANDLED_ACTIONS.has(action)) return null;

  const sponsorship = payload.sponsorship as Record<string, unknown>;
  const sponsor = sponsorship.sponsor as Record<string, unknown>;
  const tier = sponsorship.tier as Record<string, unknown>;

  return {
    action: action as SponsorshipEvent["action"],
    sponsorLogin: sponsor.login as string,
    sponsorGithubId: sponsor.id as number,
    amountCentsMonthly: tier.monthly_price_in_cents as number,
    tierName: tier.name as string,
    createdAt: sponsorship.created_at as string,
  };
}
