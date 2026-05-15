/**
 * Profile-page card for the Specter Sovereign (rank=1) and Specter
 * Mystery — Solved (rank>=2) operators.
 *
 * Rank 1 gets a gold-bordered green-haloed seal. Subsequent solvers
 * get a bronze-bordered version with their rank.
 */
type Props = {
  rank: number;
  solvedAt: Date;
};

export function SpecterSovereignCard({ rank, solvedAt }: Props) {
  const isSovereign = rank === 1;
  const date = solvedAt.toISOString().replace("T", " ").slice(0, 19) + " UTC";

  if (isSovereign) {
    return (
      <article
        data-testid="specter-sovereign-card"
        className="border-2 border-green bg-black/30 text-green font-mono p-5 max-w-xl shadow-[0_0_25px_rgba(34,197,94,0.35)]"
      >
        <div className="text-[10px] uppercase tracking-[0.4em] text-green/80 mb-3">
          ━━━ FIRST THROUGH THE HIDDEN GATE ━━━
        </div>
        <h2 className="text-2xl tracking-[0.2em] font-bold mb-1">
          SPECTER SOVEREIGN
        </h2>
        <p className="text-xs text-green/70 mb-4">
          The first operator to derive the four-fragment key and walk
          through the hidden gate of Specter I.
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div>
            <div className="uppercase tracking-wider text-green/60">Rank</div>
            <div className="text-base">#1 of 1</div>
          </div>
          <div>
            <div className="uppercase tracking-wider text-green/60">
              Sealed
            </div>
            <div className="text-base font-mono">{date}</div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-green/30 text-[10px] uppercase tracking-widest text-green/60">
          ⬢ permanent · irrevocable · only one
        </div>
      </article>
    );
  }

  return (
    <article
      data-testid="specter-mystery-solved-card"
      className="border border-green/50 bg-black/20 text-green/90 font-mono p-4 max-w-xl"
    >
      <div className="text-[10px] uppercase tracking-[0.4em] text-green/60 mb-2">
        ━━━ DERIVED THE KEY ━━━
      </div>
      <h2 className="text-lg tracking-[0.15em] font-bold mb-1">
        SPECTER MYSTERY — SOLVED
      </h2>
      <p className="text-xs text-green/60 mb-3">
        Walked through the hidden gate of Specter I. Not first — but
        on the ledger.
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <div>
          <div className="uppercase tracking-wider text-green/50">Rank</div>
          <div>#{rank}</div>
        </div>
        <div>
          <div className="uppercase tracking-wider text-green/50">Sealed</div>
          <div className="font-mono">{date}</div>
        </div>
      </div>
    </article>
  );
}
