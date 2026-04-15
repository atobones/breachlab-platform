import Link from "next/link";

export const dynamic = "force-dynamic";

const GH_SPONSORS_URL = "https://github.com/sponsors/atobones";

type Tier = {
  name: string;
  code: string;
  price: string;
  period: string;
  description: string;
  perks: string[];
  highlighted?: boolean;
};

const MONTHLY_TIERS: Tier[] = [
  {
    name: "Recruit",
    code: "recruit",
    price: "$3",
    period: "/month",
    description: "The entry level. You're on the wall.",
    perks: [
      "Name on the Hall of Operatives",
      "Recruit badge on your BreachLab profile",
    ],
  },
  {
    name: "Operator",
    code: "operator",
    price: "$10",
    period: "/month",
    description: "You actively keep the gym running.",
    perks: [
      "Everything in Recruit",
      "Supporter role in BreachLab Discord",
      "Operator badge on your profile",
    ],
    highlighted: true,
  },
  {
    name: "Phantom",
    code: "phantom",
    price: "$25",
    period: "/month",
    description: "You get early access. You shape the next tracks.",
    perks: [
      "Everything in Operator",
      "Early access to new tracks before public release",
      "Priority on feature requests and bug reports",
      "Phantom badge on your profile",
    ],
  },
  {
    name: "Architect",
    code: "architect",
    price: "$100",
    period: "/month",
    description: "You fund the mission. Your name stays forever.",
    perks: [
      "Everything in Phantom",
      "Personal shoutout in launch posts",
      "Eternal Hall of Operatives listing with a dedication message",
      "Limited Architect badge",
    ],
  },
];

const ONE_TIME_TIERS = [
  { name: "Coffee", price: "$5", desc: "Buy the maintainer a cold brew." },
  { name: "VPS month", price: "$25", desc: "Cover one full month of infra." },
  { name: "Quarter", price: "$100", desc: "Cover three months of infra." },
  { name: "Sustain", price: "$500", desc: "Half a year, no worries." },
];

export default function DonateGitHubSponsorsPage() {
  return (
    <div className="space-y-8" data-testid="donate-github-sponsors-page">
      <div className="text-xs text-muted">
        <Link href="/donate" className="hover:text-amber">
          ← Back to donation options
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-amber text-2xl">GitHub Sponsors</h1>
        <p className="text-sm text-muted max-w-2xl">
          Monthly recurring support via GitHub Sponsors — 0% platform fee,
          subsidised by Microsoft. Pick the tier that matches your level of
          support. Every tier contributes directly to infrastructure and the
          development of new tracks.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-amber text-sm uppercase tracking-wider">
          Monthly tiers
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MONTHLY_TIERS.map((tier) => (
            <TierCard key={tier.code} tier={tier} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-sm uppercase tracking-wider">
          One-time contributions
        </h2>
        <p className="text-xs text-muted max-w-2xl">
          Not into recurring? Drop a one-time contribution through the same
          GitHub Sponsors profile. These are suggestions — you can pick any
          custom amount on the GitHub page.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ONE_TIME_TIERS.map((tier) => (
            <a
              key={tier.name}
              href={GH_SPONSORS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 border border-muted/30 hover:border-amber hover:bg-amber/5 p-3 transition-colors"
            >
              <span className="text-amber text-lg">{tier.price}</span>
              <span className="text-xs text-amber">{tier.name}</span>
              <span className="text-[11px] text-muted">{tier.desc}</span>
            </a>
          ))}
        </div>
      </section>

      <p className="text-[11px] text-muted max-w-2xl">
        GitHub Sponsors uses Stripe under the hood for payment processing.
        Cards, SEPA Direct Debit, and other regional methods are supported
        depending on your country. You can cancel or change your tier at any
        time from your GitHub Sponsors dashboard.
      </p>
    </div>
  );
}

function TierCard({ tier }: { tier: Tier }) {
  return (
    <div
      className={`relative flex flex-col gap-3 border p-4 transition-colors ${
        tier.highlighted
          ? "border-amber hover:bg-amber/5"
          : "border-amber/30 hover:border-amber hover:bg-amber/5"
      }`}
      style={
        tier.highlighted
          ? {
              boxShadow:
                "0 0 0 1px rgba(255, 176, 0, 0.6), 0 0 24px rgba(255, 176, 0, 0.18)",
            }
          : undefined
      }
      data-testid={`tier-card-${tier.code}`}
    >
      {tier.highlighted && (
        <>
          <span
            aria-label="Most popular tier"
            title="Most popular"
            className="pointer-events-none absolute -top-3 -right-3 text-amber text-3xl leading-none select-none"
            style={{
              filter: "drop-shadow(0 0 10px rgba(255, 176, 0, 0.9))",
            }}
          >
            ★
          </span>
          <span className="inline-flex items-center self-start border border-amber bg-amber/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber">
            Most popular
          </span>
        </>
      )}
      <div className="space-y-1">
        <h3 className="text-amber text-lg">{tier.name}</h3>
        <p className="text-xs text-muted">{tier.description}</p>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-amber text-2xl">{tier.price}</span>
        <span className="text-xs text-muted">{tier.period}</span>
      </div>
      <ul className="text-[11px] text-muted space-y-1 list-disc list-inside flex-1">
        {tier.perks.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <a
        href={GH_SPONSORS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 border border-amber/60 hover:border-amber hover:bg-amber/10 px-3 py-2 text-xs text-amber transition-colors"
      >
        Join as {tier.name}
      </a>
    </div>
  );
}
