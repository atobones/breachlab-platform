import Link from "next/link";
import { getFoundingCohort } from "@/lib/founding/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Founding Operatives — BreachLab",
  description:
    "The first 100 operatives to clear Phantom or beyond receive permanent Founding Operative status. Ghost doesn't count — that's the entry exam.",
};

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

export default async function FoundingOperativesPage() {
  const cohort = await getFoundingCohort();
  const filled = cohort.claimed > 0;

  return (
    <div className="space-y-8" data-testid="founding-operatives-page">
      <header className="space-y-3">
        <h1 className="text-amber text-2xl phosphor wordmark">
          Founding Operatives
        </h1>
        <p className="text-sm text-text max-w-2xl">
          The first 100 operatives to clear{" "}
          <span className="text-red">Phantom</span> or any track beyond it
          receive permanent Founding status. Ghost doesn&rsquo;t count —
          that&rsquo;s the entry exam. The seat is yours forever: no
          subscription, no renewal, no way to lose it.
        </p>
        <p className="text-xs text-muted max-w-2xl">
          When the next generation looks back at where this started — your
          handle is on the wall.
        </p>
      </header>

      <section className="border border-amber/30 bg-amber/[0.03] p-4 max-w-2xl terminal-frame">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="text-amber text-xs uppercase tracking-wider mb-1">
              Cohort status
            </div>
            <div className="text-2xl wordmark text-amber phosphor tabular-nums">
              {String(cohort.claimed).padStart(3, "0")}
              <span className="text-muted"> / </span>
              {cohort.cap}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted uppercase tracking-wider mb-1">
              Seats remaining
            </div>
            <div className="text-2xl wordmark text-green tabular-nums">
              {String(cohort.remaining).padStart(3, "0")}
            </div>
          </div>
        </div>
        <div className="mt-4 h-1.5 bg-border relative overflow-hidden">
          <div
            className="h-full bg-amber transition-all"
            style={{ width: `${(cohort.claimed / cohort.cap) * 100}%` }}
          />
        </div>
        {cohort.remaining > 0 && (
          <p className="text-xs text-muted mt-3">
            Claim a seat by clearing Phantom or beyond. Ghost is the warm-up.{" "}
            <Link href="/tracks/phantom" className="text-amber hover:underline">
              Phantom track →
            </Link>
          </p>
        )}
      </section>

      {filled ? (
        <section className="space-y-2">
          <h2 className="text-amber text-sm uppercase tracking-wider">
            The roster
          </h2>
          <ol className="space-y-1 text-sm font-mono">
            {cohort.operatives.map((op) => (
              <li
                key={op.username}
                className="flex items-baseline gap-3 border-b border-border/50 py-1.5"
              >
                <span className="text-muted tabular-nums w-10 text-right shrink-0">
                  #{String(op.rank).padStart(3, "0")}
                </span>
                <Link
                  href={`/u/${op.username}`}
                  className="text-amber hover:underline truncate"
                >
                  {op.username}
                </Link>
                <span className="text-xs text-muted ml-auto tabular-nums">
                  {op.tracks.join(" · ")}
                </span>
                <span className="text-xs text-muted tabular-nums shrink-0 w-24 text-right">
                  {SHORT_DATE.format(op.earnedAt)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className="border border-dashed border-amber/40 p-6 text-center max-w-2xl">
          <p className="text-amber text-sm">
            // no operatives yet · the first seat is open
          </p>
          <p className="text-xs text-muted mt-2">
            Clear Phantom (or any pro track that ships after) to claim
            Founding rank #001.
          </p>
        </section>
      )}

      <footer className="border-t border-border pt-4 max-w-2xl space-y-2">
        <p className="text-xs text-muted">
          Founding rank is computed from the timestamp of your first
          Phantom-or-higher graduation badge. Ghost completion is required
          to unlock Phantom but does not itself claim a seat. Seats are
          awarded in order; once 100 are claimed the cohort closes
          permanently.
        </p>
        <p className="text-xs text-muted">
          <Link href="/manifesto" className="text-amber hover:underline">
            Read the manifesto
          </Link>{" "}
          —{" "}
          <Link href="/tracks/ghost" className="text-amber hover:underline">
            start with Ghost
          </Link>{" "}
          —{" "}
          <Link href="/tracks/phantom" className="text-amber hover:underline">
            then Phantom
          </Link>
        </p>
      </footer>
    </div>
  );
}
