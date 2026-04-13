import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "@/lib/btcpay/webhook";

const SECRET = "test-secret-long-enough";

function sign(body: string, secret = SECRET): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyWebhookSignature", () => {
  it("accepts valid signature", () => {
    const body = '{"type":"InvoiceSettled","invoiceId":"abc"}';
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects tampered body", () => {
    const body = '{"type":"InvoiceSettled","invoiceId":"abc"}';
    const sig = sign(body);
    const tampered = '{"type":"InvoiceSettled","invoiceId":"xyz"}';
    expect(verifyWebhookSignature(tampered, sig, SECRET)).toBe(false);
  });

  it("rejects wrong secret", () => {
    const body = '{"type":"test"}';
    expect(verifyWebhookSignature(body, sign(body, "other"), SECRET)).toBe(false);
  });

  it("rejects missing header", () => {
    expect(verifyWebhookSignature("body", null, SECRET)).toBe(false);
  });

  it("rejects length mismatch without throwing", () => {
    expect(verifyWebhookSignature("body", "sha256=short", SECRET)).toBe(false);
  });
});
