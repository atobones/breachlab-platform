"use server";

import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { createInvoice, isConfigured } from "@/lib/btcpay/client";
import { validateAmount, CURRENCY_DEFAULT } from "@/lib/btcpay/amounts";

export async function createInvoiceAction(formData: FormData): Promise<void> {
  if (!isConfigured()) {
    redirect("/donate?error=not_configured");
  }
  const amount = validateAmount(formData.get("amount"));
  if (amount === null) {
    redirect("/donate?error=invalid_amount");
  }
  const { user } = await getCurrentSession();
  let checkoutUrl: string;
  try {
    const res = await createInvoice({
      amount,
      currency: CURRENCY_DEFAULT,
      userId: user?.id ?? null,
    });
    checkoutUrl = res.checkoutUrl;
  } catch {
    redirect("/donate?error=btcpay_error");
  }
  redirect(checkoutUrl);
}
