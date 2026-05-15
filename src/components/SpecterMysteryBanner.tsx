/**
 * Site-wide banner advertising the Specter Sovereign meta-game.
 *
 * Two states:
 *   UNCLAIMED — green-toned, points players at the green haze around
 *     the shell button. Renders while no operator has earned rank=1.
 *   CLAIMED   — fades to a quieter green-bordered notice naming the
 *     Sovereign and the date. Permanent — appears for everyone who
 *     visits the site after the gate has been walked.
 *
 * Server component. Reads sovereign state directly from the DB. Lives
 * above OpsAlertBanner in layout.tsx, so unrelated incident alerts can
 * still stack underneath.
 */
import { loadSovereignContext } from "@/lib/specter-sovereign/queries";

export async function SpecterMysteryBanner() {
  const ctx = await loadSovereignContext(null);

  if (!ctx.claimedGlobally) {
    return (
      <div
        className="border-b border-green/50 bg-green/[0.05] px-4 py-3"
        role="status"
        aria-label="Specter mystery — unclaimed"
      >
        <div className="mx-auto max-w-5xl space-y-2">
          <div className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-green">
            [ SPECTER MYSTERY — UNCLAIMED ]
          </div>
          <div className="border-t border-green/30 pt-2 space-y-1.5 text-[13px] leading-relaxed text-text/90">
            <p>
              Notice the green haze around the SHELL button? That is Specter
              I&apos;s prize — unclaimed.
            </p>
            <p>
              The first operative to unravel the Specter mystery takes it. The
              haze vanishes from the site forever, and they earn a permanent
              mantle across BreachLab.
            </p>
            <p>Only one operative. First come, first claim.</p>
          </div>
        </div>
      </div>
    );
  }

  const date = ctx.sovereignClaimedAt
    ? new Date(ctx.sovereignClaimedAt).toISOString().replace("T", " ").slice(0, 19) + " UTC"
    : "earlier";

  return (
    <div
      className="border-b border-green/40 bg-green/[0.03] px-4 py-2"
      role="status"
      aria-label="Specter mystery — claimed"
    >
      <div className="mx-auto max-w-5xl flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[12px]">
        <span className="font-mono font-bold uppercase tracking-[0.18em] text-green">
          [ SPECTER MYSTERY — CLAIMED ]
        </span>
        <span className="text-text/80">
          The hidden gate of Specter I was walked by{" "}
          <span className="text-green font-bold">@{ctx.sovereignUsername}</span>{" "}
          on <span className="font-mono">{date}</span>. The mantle is theirs.
        </span>
      </div>
    </div>
  );
}
