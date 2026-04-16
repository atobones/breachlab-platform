import Link from "next/link";
import { CopyableAddress } from "@/components/donate/CopyableAddress";

const BTC_ADDRESS = "bc1q0g5vzgjryau35saf37fngz60nrf5r97c4jn0nz";

export default function DonateCryptoPage() {
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
          Send any amount directly to the wallet address below. No
          intermediaries, no processing fees, no KYC. Your coins go straight
          into the BreachLab infrastructure fund.
        </p>
      </header>

      <CopyableAddress label="Bitcoin (BTC)" address={BTC_ADDRESS} />

      <p className="text-[11px] text-muted max-w-xl">
        This is a <span className="text-amber">Bitcoin mainnet</span> address
        (Native Segwit, starts with bc1). Send{" "}
        <span className="text-amber">only BTC</span> to this address — not
        BCH, BSV, wrapped-BTC, or tokens on other chains. If you send the
        wrong coin, the funds cannot be recovered.
      </p>

      <div className="border-t border-muted/20 pt-4 max-w-xl">
        <p className="text-xs text-muted">
          After sending, if you want a{" "}
          <span className="text-amber">Supporter</span> badge on your
          BreachLab profile and Discord role — message{" "}
          <span className="text-amber">@atobones</span> in Discord with the
          transaction ID. Badges are granted manually for crypto donations.
        </p>
      </div>
    </div>
  );
}
