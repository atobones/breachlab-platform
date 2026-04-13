import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { badges, donations, users } from "@/lib/db/schema";
import { verifyWebhookSignature } from "@/lib/btcpay/webhook";
import { getInvoice, isConfigured } from "@/lib/btcpay/client";

type WebhookPayload = {
  type: string;
  invoiceId: string;
};

async function awardSupporter(userId: string) {
  await db.update(users).set({ isSupporter: true }).where(eq(users.id, userId));
  const existing = await db
    .select({ id: badges.id })
    .from(badges)
    .where(and(eq(badges.userId, userId), eq(badges.kind, "supporter")))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(badges).values({
      userId,
      kind: "supporter",
      refId: null,
    });
  }
}

async function handleSettled(invoiceId: string) {
  if (!isConfigured()) return;
  let invoice;
  try {
    invoice = await getInvoice(invoiceId);
  } catch (err) {
    console.error("[btcpay-webhook] fetch invoice failed", err);
    return;
  }

  const existing = await db
    .select({ id: donations.id })
    .from(donations)
    .where(eq(donations.btcpayInvoiceId, invoice.id))
    .limit(1);

  const amountMinor = Math.round(invoice.amount * 100);

  if (existing.length === 0) {
    await db.insert(donations).values({
      userId: invoice.metadata.userId ?? null,
      btcpayInvoiceId: invoice.id,
      amount: amountMinor,
      currency: invoice.currency,
      status: "settled",
      settledAt: new Date(),
    });
  } else {
    await db
      .update(donations)
      .set({ status: "settled", settledAt: new Date(), amount: amountMinor })
      .where(eq(donations.btcpayInvoiceId, invoice.id));
  }

  if (invoice.metadata.userId) {
    try {
      await awardSupporter(invoice.metadata.userId);
    } catch (err) {
      console.error("[btcpay-webhook] award supporter failed", err);
    }
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.BTCPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("BTCPay-Sig");
  if (!verifyWebhookSignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let body: WebhookPayload;
  try {
    body = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (
    body.type === "InvoiceSettled" ||
    body.type === "InvoicePaymentSettled"
  ) {
    try {
      await handleSettled(body.invoiceId);
    } catch (err) {
      console.error("[btcpay-webhook] handleSettled error", err);
    }
  }

  return NextResponse.json({ ok: true });
}
