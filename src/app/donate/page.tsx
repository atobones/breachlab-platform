import { isConfigured } from "@/lib/btcpay/client";
import { DonateForm } from "@/components/donate/DonateForm";
import { DonateFlash } from "@/components/donate/DonateFlash";

export const dynamic = "force-dynamic";

export default function DonatePage() {
  const configured = isConfigured();
  return (
    <div className="space-y-6" data-testid="donate-page">
      <header className="space-y-2">
        <h1 className="text-amber text-2xl">Support BreachLab</h1>
        <p className="text-sm text-muted max-w-xl">
          BreachLab is self-hosted and runs on community support. Donations
          accept BTC, ETH, USDT, USDC, XMR and BTC-Lightning through a
          self-hosted BTCPay Server — 0% processing fees, non-custodial.
        </p>
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
