import { getPublicSponsors } from "@/lib/sponsors/queries";
import { TierSection } from "@/components/operatives/TierSection";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HallOfOperativesPage() {
  const tierGroups = await getPublicSponsors();
  const totalActive = tierGroups.reduce(
    (sum, g) => sum + g.sponsors.length + g.anonymousCount,
    0,
  );

  return (
    <div className="space-y-8" data-testid="hall-of-operatives-page">
      <header className="space-y-2">
        <h1 className="text-amber text-2xl">Hall of Operatives</h1>
        <p className="text-sm text-muted max-w-2xl">
          The people who keep the lights on. Every sponsor listed here directly
          funds infrastructure, new tracks, and the mission to build real
          offensive security skills.
        </p>
        {totalActive === 0 && (
          <p className="text-sm text-muted">
            No sponsors yet.{" "}
            <Link href="/donate" className="text-amber hover:underline">
              Be the first.
            </Link>
          </p>
        )}
      </header>

      {tierGroups.map((group) => (
        <TierSection
          key={group.tier}
          tier={group.tier}
          sponsors={group.sponsors}
          anonymousCount={group.anonymousCount}
        />
      ))}

      <footer className="border-t border-border pt-4">
        <p className="text-xs text-muted">
          Want to be here?{" "}
          <Link href="/donate" className="text-amber hover:underline">
            Support the mission
          </Link>{" "}
          — GitHub Sponsors, Liberapay, or BTC.
        </p>
      </footer>
    </div>
  );
}
