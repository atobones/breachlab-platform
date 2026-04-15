import Link from "next/link";
import { isConfigured } from "@/lib/btcpay/client";
import { DonateForm } from "@/components/donate/DonateForm";
import { DonateFlash } from "@/components/donate/DonateFlash";

export const dynamic = "force-dynamic";

export default function DonateCryptoPage() {
  const configured = isConfigured();
  return (
    <div className="space-y-6" data-testid="donate-crypto-page">
      <div className="text-xs text-muted">
        <Link href="/donate" className="hover:text-amber">
          ← Back to donation options
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-amber text-2xl">Pay with crypto</h1>
        <p className="text-sm text-muted max-w-xl">
          Accepts <span className="text-amber">BTC</span>,{" "}
          <span className="text-amber">BTC-Lightning</span>,{" "}
          <span className="text-amber">XMR</span> and{" "}
          <span className="text-amber">USDT on Liquid Network</span> through
          our self-hosted BTCPay Server — 0% processing fees, non-custodial.
        </p>
      </header>

      <DonateFlash />

      {!configured && (
        <p className="text-xs text-muted border border-amber/20 p-3 max-w-xl">
          Donations are not active yet. Operator: see{" "}
          <code className="text-amber">docs/BTCPAY-SETUP.md</code>.
        </p>
      )}

      <DonateForm configured={configured} />

      <details className="max-w-xl text-xs text-muted group">
        <summary className="cursor-pointer list-none select-none inline-flex items-center gap-2 border border-muted/30 px-2 py-1 hover:border-amber/60 hover:text-amber transition-colors">
          <span
            className="inline-flex items-center justify-center w-4 h-4 border border-current text-[10px] font-semibold rounded-full"
            aria-hidden="true"
          >
            i
          </span>
          <span>Network warning — read before sending</span>
          <span className="text-[10px] opacity-60 group-open:hidden">
            ▸ click to expand
          </span>
          <span className="text-[10px] opacity-60 hidden group-open:inline">
            ▾ click to collapse
          </span>
        </summary>
        <div className="mt-2 border border-red/40 bg-red/5 p-3 space-y-1">
          <p>
            Every address you see on the checkout page is a{" "}
            <span className="text-amber">one-time deposit address</span>{" "}
            generated fresh for your invoice. Send funds{" "}
            <span className="text-amber">only</span> on the exact network
            shown on the invoice:
          </p>
          <ul className="list-disc ml-5 space-y-0.5">
            <li>
              <span className="text-amber">BTC</span> — Bitcoin mainnet only.
              Never send from a Bitcoin Cash (BCH), Bitcoin SV (BSV), or
              wrapped-BTC (WBTC on Ethereum) wallet.
            </li>
            <li>
              <span className="text-amber">BTC-Lightning</span> — pay the
              Lightning invoice (starts with <code>lnbc…</code>), not an
              on-chain Bitcoin address.
            </li>
            <li>
              <span className="text-amber">XMR</span> — Monero mainnet only.
              If your wallet asks for a network, pick mainnet.
            </li>
            <li>
              <span className="text-amber">USDT on Liquid</span> — send USDT
              exclusively on the{" "}
              <span className="text-amber">Liquid Network</span> (L-USDT). Do{" "}
              <span className="text-red">NOT</span> send USDT from Ethereum
              (ERC-20), Tron (TRC-20), Solana, Polygon, BSC, Arbitrum, Base,
              or any other chain — those funds will be lost forever and
              cannot be recovered. Compatible wallets: Blockstream Green,
              SideSwap, AQUA, Sparrow (Liquid mode).
            </li>
          </ul>
          <p className="pt-1">
            If you are not sure which network your exchange or wallet
            supports, donate in <span className="text-amber">BTC</span> or{" "}
            <span className="text-amber">BTC-Lightning</span> — they are the
            safest default.
          </p>
        </div>
      </details>
    </div>
  );
}
