import Link from "next/link";

export const dynamic = "force-dynamic";

const LIBERAPAY_URL = "https://liberapay.com/breachlab/donate";
const LIBERAPAY_PROFILE_URL = "https://liberapay.com/breachlab/";

export default function DonateLiberapayPage() {
  return (
    <div className="space-y-6" data-testid="donate-liberapay-page">
      <div className="text-xs text-muted">
        <Link href="/donate" className="hover:text-amber">
          ← Back to donation options
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-amber text-2xl">Liberapay</h1>
        <p className="text-sm text-muted max-w-2xl">
          Liberapay is an open-source, privacy-respecting recurring donation
          platform built by former Gratipay developers. You pick any weekly
          amount, Liberapay charges you at that cadence, and 100% of your
          donation reaches BreachLab — the platform itself charges zero fee.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-amber text-sm uppercase tracking-wider">
          How it works
        </h2>
        <ul className="text-xs text-muted space-y-1 list-disc list-inside max-w-2xl">
          <li>
            Click the button below — you'll land on the BreachLab Liberapay
            profile.
          </li>
          <li>
            Pick any weekly amount (Liberapay charges in EUR, USD, or GBP).
          </li>
          <li>
            Pay once by card — Liberapay handles the recurring charge from
            there.
          </li>
          <li>
            Cancel, pause, or adjust at any time from your Liberapay account.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-sm uppercase tracking-wider">
          Privacy levels
        </h2>
        <p className="text-xs text-muted max-w-2xl">
          Liberapay lets you pick how visible your donation is. You choose
          this on the Liberapay donate page itself:
        </p>
        <ul className="text-xs text-muted space-y-1 list-disc list-inside max-w-2xl">
          <li>
            <span className="text-amber">Public</span> — your name and avatar
            appear on the Hall of Operatives
          </li>
          <li>
            <span className="text-amber">Private</span> — only the BreachLab
            maintainer sees who you are
          </li>
          <li>
            <span className="text-amber">Secret</span> — nobody sees your
            identity, not even the maintainer; your contribution is counted
            anonymously toward the weekly goal
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-sm uppercase tracking-wider">
          Why Liberapay
        </h2>
        <p className="text-xs text-muted max-w-2xl">
          Unlike Patreon or Ko-fi, Liberapay is itself a non-profit run by
          volunteers on open-source software. It accepts zero platform fee,
          does not track its donors, does not sell data, and has no ads. It
          is the closest philosophical match to BreachLab's self-hosted,
          non-custodial stack.
        </p>
      </section>

      <div className="flex flex-wrap gap-3 pt-2">
        <a
          href={LIBERAPAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-amber hover:bg-amber/10 px-6 py-3 text-sm text-amber transition-colors"
          data-testid="donate-liberapay-cta"
        >
          <span aria-hidden="true">♥</span>
          <span>Donate on Liberapay</span>
        </a>
        <a
          href={LIBERAPAY_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-muted/40 hover:border-amber hover:text-amber px-6 py-3 text-xs text-muted transition-colors"
        >
          View public profile →
        </a>
      </div>
    </div>
  );
}
