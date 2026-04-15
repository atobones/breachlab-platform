import { SpotlightCard } from "@/components/donate/SpotlightCard";

export const dynamic = "force-dynamic";

export default function DonatePage() {
  return (
    <div className="space-y-8" data-testid="donate-page">
      <header className="space-y-2">
        <h1 className="text-amber text-2xl">Support BreachLab</h1>
        <p className="text-sm text-muted max-w-2xl">
          BreachLab is self-hosted and runs on community support. Pick whatever
          rail fits you — crypto, monthly sponsor tiers through GitHub, or
          flexible recurring donations through Liberapay. No custodian. No KYC
          on the crypto path. No third-party eyes on the donation flow.
        </p>
      </header>

      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="donate-methods"
      >
        <SpotlightCard
          href="/donate/crypto"
          icon="⚡"
          title="Pay with crypto"
          summary="BTC, Lightning, XMR and USDT on Liquid Network"
          bullets={[
            "0% processing fees",
            "Fully non-custodial",
            "Self-hosted BTCPay Server",
          ]}
          cta="Donate crypto →"
          testId="donate-card-crypto"
        />
        <SpotlightCard
          href="/donate/github-sponsors"
          icon="★"
          title="GitHub Sponsors"
          summary="Monthly recurring support with operator tiers"
          bullets={[
            "$3 – $100 / month tiers",
            "Supporter role in Discord",
            "0% platform fee (Microsoft subsidised)",
          ]}
          cta="See sponsor tiers →"
          testId="donate-card-github"
        />
        <SpotlightCard
          href="/donate/liberapay"
          icon="♥"
          title="Liberapay"
          summary="Flexible weekly recurring donations"
          bullets={[
            "Pick any weekly amount",
            "0% platform fee",
            "Privacy-respecting, open source",
          ]}
          cta="Sponsor via Liberapay →"
          testId="donate-card-liberapay"
        />
      </div>

      <p className="text-[11px] text-muted max-w-2xl">
        Whichever path you pick, every contribution goes directly into the
        infrastructure that keeps the wargame running — VPS, NVMe volume for
        the Bitcoin and Monero nodes, domains, and the ongoing development of
        new tracks.
      </p>
    </div>
  );
}
