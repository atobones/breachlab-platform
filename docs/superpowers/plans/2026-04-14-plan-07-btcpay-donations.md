# BreachLab Platform — Plan 07: BTCPay Donations

**Goal:** After this plan, a visitor can go to `/donate`, pick a preset amount (or custom), optionally link to their logged-in account, and pay via BTCPay Server (BTC, ETH, USDT, USDC, XMR, BTC-Lightning — whatever the connected BTCPay store supports). Confirmed payments arrive via webhook, write a `donations` row, and — if linked to a user — flip `is_supporter = true` and award the `supporter` badge. All BTCPay code is env-gated so the app runs fine without a configured server.

**Architecture:**
- `donations` table: stores every settled invoice (nullable user_id for anonymous, unique btcpay_invoice_id, amount in sats/cents, currency, status, created_at, settled_at).
- `/donate` page: preset amount buttons (1/5/10/25/100 USD) + custom input + Donate button → server action creates invoice via BTCPay API → 302 to checkout URL.
- `/api/btcpay/webhook`: POST endpoint. Verifies HMAC signature using `BTCPAY_WEBHOOK_SECRET`. Handles `InvoiceSettled` and `InvoicePaymentSettled` event types. Upserts donation row, and if invoice metadata has `userId`, flips `is_supporter` + awards badge.
- BTCPay client: thin wrapper around `fetch` to the BTCPay Greenfield API at `${BTCPAY_URL}/api/v1/stores/${BTCPAY_STORE_ID}/invoices`.
- **No BTCPay server is installed here.** Plan ships the code. Real-world activation requires running BTCPay separately (spec 6.4) — a BTCPAY-SETUP.md note documents this as operator work.

**Tech stack additions:** none. Native `fetch` + `node:crypto` HMAC.

**Env vars (all optional):**
- `BTCPAY_URL` — e.g. `https://pay.breachlab.io`
- `BTCPAY_STORE_ID` — store ID from BTCPay dashboard
- `BTCPAY_API_KEY` — API key with `btcpay.store.cancreateinvoice` + `btcpay.store.canviewinvoices` permissions
- `BTCPAY_WEBHOOK_SECRET` — shared secret for HMAC signature verification

**Out of scope:** running BTCPay itself, wallet xpub generation, recurring donations, donation leaderboard, donor dashboard, anonymous→linked migration after the fact. Lightning Address. Subscription tiers.

---

## File structure

```
breachlab-platform/
├── drizzle/0005_donations.sql
├── src/
│   ├── lib/
│   │   ├── db/schema.ts                           -- +donations table
│   │   └── btcpay/
│   │       ├── client.ts                          -- env-gated API client (createInvoice, getInvoice)
│   │       ├── webhook.ts                         -- verifyWebhookSignature pure fn
│   │       └── amounts.ts                         -- preset amounts + validation
│   ├── app/
│   │   ├── donate/
│   │   │   ├── page.tsx                           -- donate UI
│   │   │   └── actions.ts                         -- createInvoiceAction server action
│   │   └── api/btcpay/webhook/route.ts            -- POST handler
│   └── components/
│       └── donate/
│           └── DonateForm.tsx                     -- preset + custom input + submit
└── tests/
    ├── unit/
    │   └── btcpay/
    │       ├── amounts.test.ts
    │       └── webhook.test.ts
    └── e2e/
        └── donate.spec.ts                         -- /donate page renders, submit is gated when not configured
```

---

## Task 1: Schema

**Files:** `src/lib/db/schema.ts` + migration.

```ts
export const donations = pgTable("donations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  btcpayInvoiceId: text("btcpay_invoice_id").notNull().unique(),
  amount: integer("amount").notNull(),            // in minor units (cents for USD)
  currency: text("currency").notNull(),           // e.g. "USD"
  status: text("status").notNull().default("pending"), // pending|settled|expired|invalid
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
});

export type Donation = typeof donations.$inferSelect;
```

Generate + apply migration. 64 unit tests still green.

---

## Task 2: Amounts (TDD)

**Files:** `src/lib/btcpay/amounts.ts`, `tests/unit/btcpay/amounts.test.ts`.

```ts
export const PRESETS_USD = [1, 5, 10, 25, 100] as const;
export const CURRENCY_DEFAULT = "USD";

export function validateAmount(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  if (n > 10000) return null;
  return Math.round(n * 100) / 100;
}
```

Tests:
- Valid: 1, 5, 10, 25, 100, 3.5 → returned.
- Invalid: 0, -1, "abc", NaN, 10001 → null.
- Rounding: 1.999 → 2 (well, 2.00 after round-to-cents).

---

## Task 3: Webhook signature verification (TDD)

**Files:** `src/lib/btcpay/webhook.ts`, `tests/unit/btcpay/webhook.test.ts`.

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;
  // BTCPay sends: "sha256=<hex>"
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

Tests:
- Valid signature → true.
- Tampered body → false.
- Wrong secret → false.
- Missing header → false.
- Length mismatch doesn't throw → false.

---

## Task 4: BTCPay client

**Files:** `src/lib/btcpay/client.ts`.

```ts
export function isConfigured(): boolean {
  return Boolean(
    process.env.BTCPAY_URL &&
    process.env.BTCPAY_STORE_ID &&
    process.env.BTCPAY_API_KEY,
  );
}

export type InvoiceCreateInput = {
  amount: number;    // in major currency unit (e.g. 5 for $5)
  currency: string;  // e.g. "USD"
  userId?: string | null;
  redirectUrl?: string;
};

export async function createInvoice(input: InvoiceCreateInput): Promise<{
  invoiceId: string;
  checkoutUrl: string;
}> {
  if (!isConfigured()) throw new Error("BTCPay not configured");
  const url = `${process.env.BTCPAY_URL}/api/v1/stores/${process.env.BTCPAY_STORE_ID}/invoices`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${process.env.BTCPAY_API_KEY}`,
    },
    body: JSON.stringify({
      amount: input.amount.toString(),
      currency: input.currency,
      metadata: {
        userId: input.userId ?? null,
        source: "breachlab-donate",
      },
      checkout: {
        redirectURL: input.redirectUrl ?? `${process.env.SITE_URL}/donate?thanks=1`,
      },
    }),
  });
  if (!res.ok) throw new Error(`btcpay invoice create failed: ${res.status}`);
  const json = (await res.json()) as { id: string; checkoutLink: string };
  return { invoiceId: json.id, checkoutUrl: json.checkoutLink };
}
```

No tests at this layer (real HTTP; covered manually once BTCPay is live).

---

## Task 5: /donate page + server action + DonateForm

**Files:** `src/app/donate/page.tsx`, `src/app/donate/actions.ts`, `src/components/donate/DonateForm.tsx`.

`actions.ts`:
```ts
"use server";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { createInvoice, isConfigured } from "@/lib/btcpay/client";
import { validateAmount, CURRENCY_DEFAULT } from "@/lib/btcpay/amounts";

export async function createInvoiceAction(formData: FormData) {
  if (!isConfigured()) {
    redirect("/donate?error=not_configured");
  }
  const amount = validateAmount(formData.get("amount"));
  if (amount === null) redirect("/donate?error=invalid_amount");
  const { user } = await getCurrentSession();
  const { checkoutUrl } = await createInvoice({
    amount,
    currency: CURRENCY_DEFAULT,
    userId: user?.id ?? null,
  });
  redirect(checkoutUrl);
}
```

`page.tsx`: server component. Shows:
- Header: "Support BreachLab" + short copy about self-hosted / 0% fees.
- `?thanks=1` → success flash.
- `?error=invalid_amount|not_configured` → error flash.
- If not configured: show the flash + an installation note pointing to `BTCPAY-SETUP.md`.
- `<DonateForm configured={isConfigured()} />`.
- Links to Monero address / BTC address if Boss wants fallback (out of scope for v1 — just BTCPay button).

`DonateForm.tsx`: client component.
- Preset buttons 1/5/10/25/100. Clicking sets the custom-input value.
- Custom `<input type="number" step="0.01" min="1" name="amount">`.
- Submit button → form `action={createInvoiceAction}`.
- Disabled state when `!configured`.

---

## Task 6: /api/btcpay/webhook route

**Files:** `src/app/api/btcpay/webhook/route.ts`.

```ts
export async function POST(req: NextRequest) {
  const secret = process.env.BTCPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const rawBody = await req.text();
  const sig = req.headers.get("BTCPay-Sig");
  if (!verifyWebhookSignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as {
    type: string;
    invoiceId: string;
    metadata?: { userId?: string | null };
  };

  if (body.type === "InvoiceSettled" || body.type === "InvoicePaymentSettled") {
    // Fetch the invoice to get authoritative amount/currency (metadata is untrusted)
    await handleSettled(body.invoiceId);
  }
  return NextResponse.json({ ok: true });
}
```

`handleSettled(invoiceId)`:
1. GET `/api/v1/stores/:storeId/invoices/:invoiceId` via BTCPay client (add `getInvoice` there).
2. Upsert `donations` row by `btcpay_invoice_id`: set status=settled, settledAt=now, amount (from invoice), currency, userId (from invoice.metadata.userId).
3. If userId present:
   - `UPDATE users SET is_supporter=true WHERE id=userId`.
   - Insert `badges` row kind='supporter', refId=null — idempotent (skip if exists).

All operations log but never throw back to BTCPay — return 200 on any internal error to prevent retry storms. Log errors for manual ops.

---

## Task 7: E2E spec

**Files:** `tests/e2e/donate.spec.ts`.

- `/donate` renders the form.
- `?thanks=1` shows success flash.
- If `BTCPAY_URL` not set (default in CI), submitting the form redirects to `/donate?error=not_configured`.
- Preset buttons populate the custom input (client-side check).

No end-to-end BTCPay flow tested — requires real BTCPay.

---

## Task 8: BTCPAY-SETUP.md operator docs

**Files:** `docs/BTCPAY-SETUP.md`.

Short checklist for Boss on how to go live:
1. Provision BTCPay Server via its one-click docker-compose install on the VPS.
2. Point `pay.breachlab.io` DNS A-record to VPS IP.
3. Configure Caddy reverse proxy for `pay.breachlab.io` → local BTCPay port.
4. Generate wallet xpub in BTCPay, create store.
5. Connect Lightning node (optional).
6. Create API key with store permissions.
7. Add webhook: `https://breachlab.<tld>/api/btcpay/webhook` with shared secret.
8. Drop env vars into `.env.local` / production env.
9. Test with a $1 invoice.

---

## Task 9: Sanity + tag

- `npm test && DATABASE_URL=... npm run test:e2e`
- `git tag v0.7.0-btcpay`
- Push main + tag
- Update Obsidian changelog

---

## Spec coverage

- Donations model & flow → Tasks 1, 4, 5, 6
- Webhook security (HMAC) → Task 3
- Supporter badge wiring → Task 6 (inside handleSettled)
- Operator handoff → Task 8

## Notes for executor

- DO NOT trust `body.metadata.userId` directly — re-fetch the invoice via BTCPay client and use the server-authoritative metadata.
- Idempotency: upsert by `btcpay_invoice_id`; handle duplicate webhook delivery gracefully.
- The webhook must return 200 quickly — BTCPay retries on non-2xx.
- All BTCPay code must no-op gracefully when env vars missing. The only place that throws is the client itself (callers gate via `isConfigured()`).
- This plan ships the code. Making it actually process payments is a Boss task (install BTCPay on VPS).
