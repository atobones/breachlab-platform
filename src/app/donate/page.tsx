import { isConfigured } from "@/lib/btcpay/client";
import { DonateForm } from "@/components/donate/DonateForm";
import { DonateFlash } from "@/components/donate/DonateFlash";

export const dynamic = "force-dynamic";

export default function DonatePage() {
  const configured = isConfigured();
  return (
    <div className="space-y-6" data-testid="donate-page">
      <header className="space-y-3">
        <h1 className="text-amber text-2xl">Support BreachLab</h1>
        <p className="text-sm text-muted max-w-xl">
          BreachLab is self-hosted and runs on community support. Donations
          accept <span className="text-amber">BTC</span>,{" "}
          <span className="text-amber">BTC-Lightning</span>,{" "}
          <span className="text-amber">XMR</span> and{" "}
          <span className="text-amber">USDT on Liquid Network</span> through a
          self-hosted BTCPay Server — 0% processing fees, non-custodial. No
          custodian. No KYC. No third-party eyes on the donation flow.
        </p>
        <div
          className="border border-red/40 bg-red/5 p-3 text-xs text-muted max-w-xl space-y-1"
          role="alert"
        >
          <p className="text-red font-semibold">
            ⚠ Network warning — read before sending
          </p>
          <p>
            Every address you see on the checkout page is a{" "}
            <span className="text-amber">one-time deposit address</span>{" "}
            generated fresh for your invoice. Send funds{" "}
            <span className="text-amber">only</span> on the exact network shown
            on the invoice:
          </p>
          <ul className="list-disc ml-5 space-y-0.5">
            <li>
              <span className="text-amber">BTC</span> — Bitcoin mainnet only.
              Never send from a Bitcoin Cash (BCH), Bitcoin SV (BSV), or
              wrapped-BTC (WBTC on Ethereum) wallet.
            </li>
            <li>
              <span className="text-amber">BTC-Lightning</span> — pay the
              Lightning invoice (starts with <code>lnbc…</code>), not an on-chain
              Bitcoin address.
            </li>
            <li>
              <span className="text-amber">XMR</span> — Monero mainnet only. If
              your wallet asks for a network, pick mainnet.
            </li>
            <li>
              <span className="text-amber">USDT on Liquid</span> — send USDT
              exclusively on the{" "}
              <span className="text-amber">Liquid Network</span> (L-USDT). Do{" "}
              <span className="text-red">NOT</span> send USDT from Ethereum
              (ERC-20), Tron (TRC-20), Solana, Polygon, BSC, Arbitrum, Base, or
              any other chain — those funds will be lost forever and cannot be
              recovered. Compatible wallets: Blockstream Green, SideSwap, AQUA,
              Sparrow (Liquid mode).
            </li>
          </ul>
          <p className="text-muted pt-1">
            If you are not sure which network your exchange or wallet supports,
            donate in <span className="text-amber">BTC</span> or{" "}
            <span className="text-amber">BTC-Lightning</span> — they are the
            safest default.
          </p>
        </div>
      </header>
      <DonateFlash />
      {!configured && (
        <p className="text-xs text-muted border border-amber/20 p-3">
          Donations are not active yet. Operator: see{" "}
          <code className="text-amber">docs/BTCPAY-SETUP.md</code>.
        </p>
      )}
      <DonateForm configured={configured} />
    </div>
  );
}
