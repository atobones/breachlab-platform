import { SpotlightGrid } from "@/components/donate/SpotlightGrid";
import type { SpotlightCardData } from "@/components/donate/SpotlightCard";

export const dynamic = "force-dynamic";

const DONATE_METHODS: SpotlightCardData[] = [
  {
    href: "/donate/crypto",
    icon: "⚡",
    title: "Pay with crypto",
    summary: "Send Bitcoin directly to the BreachLab wallet",
    bullets: [
      "0% processing fees",
      "Non-custodial — your coins, our address",
      "One-click copy, any amount",
    ],
    cta: "Donate crypto →",
    testId: "donate-card-crypto",
  },
  {
    href: "/donate/liberapay",
    icon: "♥",
    title: "Liberapay",
    summary: "Flexible weekly recurring donations",
    bullets: [
      "Pick any weekly amount",
      "0% platform fee",
      "Privacy-respecting, open source",
    ],
    cta: "Sponsor via Liberapay →",
    testId: "donate-card-liberapay",
  },
];

export default function DonatePage() {
  return (
    <div className="space-y-8" data-testid="donate-page">
      <header className="space-y-2">
        <h1 className="text-amber text-2xl">Support BreachLab</h1>
        <p className="text-sm text-muted max-w-2xl">
          BreachLab is self-hosted and runs on community support. Pick whatever
          rail fits you — crypto, or flexible recurring donations through
          Liberapay. No custodian. No KYC on the crypto path. No third-party
          eyes on the donation flow.
        </p>
      </header>

      <SpotlightGrid
        cards={DONATE_METHODS}
        className="grid gap-4 sm:grid-cols-2"
        testId="donate-methods"
      />

      <p className="text-[11px] text-muted max-w-2xl">
        Whichever path you pick, every contribution goes directly into the
        infrastructure that keeps the wargame running — VPS, NVMe volume for
        the Bitcoin and Monero nodes, domains, and the ongoing development of
        new tracks.
      </p>
    </div>
  );
}
