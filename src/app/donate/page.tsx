import Link from "next/link";

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
        <DonateMethodCard
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
        <DonateMethodCard
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
        <DonateMethodCard
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

function DonateMethodCard({
  href,
  icon,
  title,
  summary,
  bullets,
  cta,
  testId,
}: {
  href: string;
  icon: string;
  title: string;
  summary: string;
  bullets: string[];
  cta: string;
  testId: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="group flex flex-col gap-3 border border-amber/30 p-5 hover:border-amber hover:bg-amber/5 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="text-amber text-2xl">
          {icon}
        </span>
        <h2 className="text-amber text-lg group-hover:underline">{title}</h2>
      </div>
      <p className="text-xs text-muted">{summary}</p>
      <ul className="text-[11px] text-muted space-y-1 list-disc list-inside flex-1">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <span className="mt-2 text-xs text-amber group-hover:underline">
        {cta}
      </span>
    </Link>
  );
}
