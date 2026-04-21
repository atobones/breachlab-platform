# BTCPay Server — Operator Setup

This app ships **code** for accepting crypto donations, but the BTCPay Server itself is operator-managed infrastructure. This checklist gets you from zero to a working donate button.

## 1. Provision BTCPay Server on the VPS

BreachLab runs on `204.168.229.209`. Pick a subdomain, e.g. `pay.breachlab.org`.

Easiest path is the official one-click Docker deployment:

```bash
ssh root@204.168.229.209
mkdir btcpayserver && cd btcpayserver
git clone https://github.com/btcpayserver/btcpayserver-docker
cd btcpayserver-docker
export BTCPAY_HOST="pay.breachlab.org"
export NBITCOIN_NETWORK="mainnet"
export BTCPAYGEN_CRYPTO1="btc"
export BTCPAYGEN_ADDITIONAL_FRAGMENTS="opt-save-storage-s;opt-add-xmr"
export BTCPAYGEN_LIGHTNING="clightning"  # or "lnd" — your call
export BTCPAYGEN_REVERSEPROXY="caddy"
export LETSENCRYPT_EMAIL="<your@email>"
. ./btcpay-setup.sh -i
```

BTCPay takes 5–15 minutes to sync headers. Bitcoin Core full sync can take days but is not required to start accepting payments (pruned mode is default).

## 2. DNS

Add an A-record `pay` → `204.168.229.209` (Cloudflare or whatever you end up using). Wait for propagation. Verify: `dig pay.breachlab.org`.

## 3. Create the BreachLab store

In the BTCPay admin UI:
- Create account → verify email.
- **Stores** → **Create Store** → name `BreachLab`.
- **Settings → General** → set display currency `USD`.
- **Wallets → Bitcoin** → **Set up wallet** → either connect existing xpub OR generate a new wallet in BTCPay. **Back up the seed.**
- (Optional) **Wallets → Monero** → same.
- (Optional) **Lightning** → connect internal node.

## 4. Create API key

- **Account → API Keys → Generate Key**.
- Permissions:
  - `btcpay.store.cancreateinvoice`
  - `btcpay.store.canviewinvoices`
- Copy the key once — it won't show again.

## 5. Register webhook

- **Store → Settings → Webhooks → Create webhook**.
- Payload URL: `https://breachlab.org/api/btcpay/webhook`
- Secret: generate a long random string (e.g. `openssl rand -hex 32`). Save it.
- Events: `Invoice Settled`, `Invoice Payment Settled`.

## 6. Drop env vars into BreachLab

Add to the deployed `.env` (and your local `.env.local` if testing):

```
BTCPAY_URL=https://pay.breachlab.org
BTCPAY_STORE_ID=<store id from BTCPay dashboard URL>
BTCPAY_API_KEY=<key from step 4>
BTCPAY_WEBHOOK_SECRET=<secret from step 5>
SITE_URL=https://breachlab.org
```

Restart the Next.js container.

## 7. Test end-to-end

- Visit `https://breachlab.org/donate`.
- Pick $1, click Donate → redirected to BTCPay checkout.
- Complete payment on testnet or with a small mainnet amount.
- After a minute, the webhook should fire.
- Check logs: `docker logs breachlab-web --tail 50 | grep btcpay-webhook`.
- Check DB: `SELECT * FROM donations` — row with `status='settled'`.
- If donor was logged in: check `SELECT is_supporter FROM users WHERE id=...` → `true`, and supporter badge row exists.
- Run `npx tsx scripts/sync-discord-roles.ts --user <username>` to push the Supporter Discord role.

## Security notes

- Webhook handler uses timing-safe HMAC verification — never accepts a body without a valid `BTCPay-Sig` header.
- Invoice amounts are re-fetched from BTCPay before DB writes — we never trust metadata sent to the webhook.
- `donations.user_id` is nullable so anonymous donations still work.
- Duplicate webhook delivery is idempotent (upsert by `btcpay_invoice_id`).
- The BTCPay admin runs on a separate subdomain with its own Caddy TLS — do not proxy through Next.js.
