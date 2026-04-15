export function isConfigured(): boolean {
  return Boolean(
    process.env.BTCPAY_URL &&
      process.env.BTCPAY_STORE_ID &&
      process.env.BTCPAY_API_KEY,
  );
}

function apiBase(): string {
  return `${process.env.BTCPAY_URL}/api/v1/stores/${process.env.BTCPAY_STORE_ID}`;
}

function authHeader(): Record<string, string> {
  return {
    Authorization: `token ${process.env.BTCPAY_API_KEY}`,
  };
}

export type InvoiceCreateInput = {
  amount: number;
  currency: string;
  userId?: string | null;
  redirectUrl?: string;
};

export type CreatedInvoice = {
  invoiceId: string;
  checkoutUrl: string;
};

export async function createInvoice(
  input: InvoiceCreateInput,
): Promise<CreatedInvoice> {
  if (!isConfigured()) throw new Error("BTCPay not configured");
  const site = process.env.SITE_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiBase()}/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({
      amount: input.amount.toString(),
      currency: input.currency,
      metadata: {
        userId: input.userId ?? null,
        source: "breachlab-donate",
      },
      checkout: {
        redirectURL: input.redirectUrl ?? `${site}/donate/crypto?thanks=1`,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`btcpay invoice create failed: ${res.status}`);
  }
  const json = (await res.json()) as { id: string; checkoutLink: string };
  return { invoiceId: json.id, checkoutUrl: json.checkoutLink };
}

export type InvoiceDetails = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  metadata: { userId?: string | null };
};

export async function getInvoice(invoiceId: string): Promise<InvoiceDetails> {
  if (!isConfigured()) throw new Error("BTCPay not configured");
  const res = await fetch(`${apiBase()}/invoices/${invoiceId}`, {
    headers: authHeader(),
  });
  if (!res.ok) {
    throw new Error(`btcpay invoice fetch failed: ${res.status}`);
  }
  const json = (await res.json()) as {
    id: string;
    amount: string;
    currency: string;
    status: string;
    metadata?: { userId?: string | null };
  };
  return {
    id: json.id,
    amount: Number(json.amount),
    currency: json.currency,
    status: json.status,
    metadata: { userId: json.metadata?.userId ?? null },
  };
}
