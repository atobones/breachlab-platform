import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guards";
import { getEmailClient } from "@/lib/email/client";

export const runtime = "nodejs";

/**
 * Admin probe for Resend delivery. Sends a minimal email to the address
 * supplied in the query string (`?to=<addr>`) and returns the Resend
 * response verbatim. Useful when players report they never got the
 * verification link — the real failure is almost always 'domain not
 * verified' / 'rate limit' / 'key revoked', none of which used to be
 * surfaced.
 *
 * Gated by the standard admin gate (isAdmin + TOTP enrolled). Not worth
 * a fresh-TOTP prompt — this endpoint only reveals the sender's own
 * diagnostic state, not user data.
 */
export async function POST(req: NextRequest) {
  const check = await requireAdmin();
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: 401 });
  }

  const to = req.nextUrl.searchParams.get("to");
  if (!to || !/^\S+@\S+\.\S+$/.test(to)) {
    return NextResponse.json(
      { error: "provide ?to=<email>" },
      { status: 400 }
    );
  }

  try {
    await getEmailClient().send({
      to,
      subject: "BreachLab email probe",
      text: `This is a BreachLab admin email-delivery probe.\n\nIf you received this, Resend is working.\n\nTriggered by: ${check.actor.username}\n`,
    });
    return NextResponse.json({ ok: true, to });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
