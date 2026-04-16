import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sponsors } from "@/lib/sponsors/schema";
import { verifyGitHubSignature, parseSponsorshipEvent } from "@/lib/webhooks/github-sponsors";
import { computeTier } from "@/lib/sponsors/tiers";

export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOKS_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";

  if (!verifyGitHubSignature(body, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const event = parseSponsorshipEvent(payload);

  if (!event) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const tierCode = computeTier(event.amountCentsMonthly);

  if (event.action === "created" || event.action === "tier_changed") {
    const [existing] = await db
      .select()
      .from(sponsors)
      .where(
        and(
          eq(sponsors.source, "github_sponsors"),
          eq(sponsors.externalId, event.sponsorLogin),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(sponsors)
        .set({
          tierCode,
          amountCentsMonthly: event.amountCentsMonthly,
          endedAt: null,
        })
        .where(eq(sponsors.id, existing.id));
    } else {
      await db.insert(sponsors).values({
        source: "github_sponsors",
        externalId: event.sponsorLogin,
        tierCode,
        amountCentsMonthly: event.amountCentsMonthly,
        startedAt: new Date(event.createdAt),
      });
    }
  }

  if (event.action === "cancelled") {
    await db
      .update(sponsors)
      .set({ endedAt: new Date() })
      .where(
        and(
          eq(sponsors.source, "github_sponsors"),
          eq(sponsors.externalId, event.sponsorLogin),
        ),
      );
  }

  return NextResponse.json({ ok: true });
}
