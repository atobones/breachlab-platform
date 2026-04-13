"use client";

import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, { text: string; className: string }> = {
  thanks: {
    text: "Thank you for supporting BreachLab. Your operative role will appear on Discord after the next sync.",
    className: "text-green",
  },
  invalid_amount: {
    text: "That amount is not valid. Try 1–10000 USD.",
    className: "text-red",
  },
  not_configured: {
    text: "Donations are not configured on this server.",
    className: "text-red",
  },
  btcpay_error: {
    text: "BTCPay rejected the invoice. Try again later.",
    className: "text-red",
  },
};

export function DonateFlash() {
  const params = useSearchParams();
  const thanks = params.get("thanks");
  const error = params.get("error");
  const key = thanks ? "thanks" : error;
  const msg = key ? MESSAGES[key] : null;
  if (!msg) return null;
  return (
    <p data-testid="donate-flash" className={`text-xs ${msg.className}`}>
      {msg.text}
    </p>
  );
}
