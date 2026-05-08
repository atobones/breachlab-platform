import Link from "next/link";
import { CopyableAddress } from "@/components/donate/CopyableAddress";

const BTC_ADDRESS = "bc1q0g5vzgjryau35saf37fngz60nrf5r97c4jn0nz";
const SOLANA_ADDRESS = "FBXpm7m1FK6SRngPBZ69WMSwtTLCBwQeEhUPSp5bVNUV";

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
          Send any amount directly to one of the wallets below. No
          intermediaries, no processing fees, no KYC. Your coins go straight
          into the BreachLab infrastructure fund.
        </p>
      </header>

      <section className="space-y-3">
        <CopyableAddress label="Bitcoin (BTC)" address={BTC_ADDRESS} />
        <p className="text-[11px] text-muted max-w-xl">
          <span className="text-amber">Bitcoin mainnet</span> only (Native
          Segwit, starts with bc1). Do not send BCH, BSV, wrapped-BTC, or
          tokens from other chains — funds cannot be recovered.
        </p>
      </section>

      <section className="space-y-3">
        <CopyableAddress
          label="Solana (SOL / USDC / USDT)"
          address={SOLANA_ADDRESS}
        />
        <p className="text-[11px] text-muted max-w-xl">
          <span className="text-amber">Solana network</span> only. Accepts
          native SOL and SPL stablecoins (USDC, USDT) at the same address.{" "}
          <span className="text-amber">
            Do not send USDC or USDT on Ethereum (ERC-20), Tron (TRC-20),
            BSC, Polygon, or any other chain
          </span>{" "}
          — wrong-network sends are unrecoverable.
        </p>
      </section>

      <div className="border-t border-muted/20 pt-4 max-w-xl">
        <p className="text-xs text-muted">
          After sending, if you want a{" "}
          <span className="text-amber">Supporter</span> badge on your
          BreachLab profile and Discord role — message{" "}
          <span className="text-amber">@atobones</span> in Discord with the
          transaction ID (or Solana signature). Badges are granted manually
          for crypto donations.
        </p>
      </div>
    </div>
  );
}
