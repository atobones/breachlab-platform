import Link from "next/link";
import { topChampionsByRoundWins } from "@/lib/koth/honors";
import { titleFromRoundWins } from "@/lib/koth/titles";

export const metadata = {
  title: "Crown Wars · Champions — BreachLab",
};

export const dynamic = "force-dynamic";

export default async function KothChampionsPage() {
  const champions = await topChampionsByRoundWins(20);

  return (
    <article className="space-y-6 max-w-3xl" data-testid="koth-champions">
      <header className="space-y-2">
        <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono">
          ▸ predator arena · champions
        </div>
        <h1 className="text-amber text-2xl sm:text-3xl phosphor wordmark font-bold tracking-[0.08em]">
          CROWN CHAMPIONS
        </h1>
        <p className="text-[13px] text-muted leading-relaxed max-w-2xl">
          Lifetime ledger of operators who have closed out a round on
          top. Points sum across all winning rounds.
        </p>
      </header>

      {champions.length === 0 ? (
        <section className="border border-border/60 px-4 py-8 text-center">
          <p className="text-[13px] text-muted">
            no champions yet — the first round to close with a scoring
            operator opens this list.
          </p>
        </section>
      ) : (
        <section className="border border-amber/30 px-4 py-3 space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-amber">
            ▸ top {champions.length} · by lifetime round wins
          </div>
          <ol className="space-y-1 text-[12px] font-mono tabular-nums">
            {champions.map((c, i) => {
              const title = titleFromRoundWins(c.roundWins);
              return (
                <li
                  key={c.userId}
                  className={`flex items-center gap-3 py-1 ${
                    i === 0 ? "border-b border-amber/15 pb-2 mb-1" : ""
                  }`}
                >
                  <span
                    className={`w-6 text-right ${
                      i === 0
                        ? "text-amber text-base"
                        : i < 3
                          ? "text-amber/80"
                          : "text-muted"
                    }`}
                  >
                    {i + 1}.
                  </span>
                  <span className="text-text flex-1 truncate flex items-baseline gap-1.5">
                    {title && (
                      <span
                        className={`text-[9px] tracking-wider ${title.color}`}
                      >
                        {title.glyph} {title.label}
                      </span>
                    )}
                    {c.username}
                  </span>
                  <span className="text-amber w-32 text-right">
                    {c.totalPoints} pt{" "}
                    <span className="text-muted">
                      · × {c.roundWins} {c.roundWins === 1 ? "win" : "wins"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Title ladder reference */}
      <section className="border border-border/60 px-4 py-3 space-y-2">
        <h2 className="text-amber text-[11px] font-mono tracking-[0.3em] uppercase">
          ─ titles
        </h2>
        <table className="text-[12px] font-mono w-full tabular-nums">
          <tbody>
            <tr className="border-b border-border/30">
              <td className="py-1 pr-4 text-green/80 whitespace-nowrap">◇ OPERATIVE</td>
              <td className="py-1 text-text">first round win</td>
            </tr>
            <tr className="border-b border-border/30">
              <td className="py-1 pr-4 text-amber/80 whitespace-nowrap">◆ HUNTER</td>
              <td className="py-1 text-text">5 round wins</td>
            </tr>
            <tr className="border-b border-border/30">
              <td className="py-1 pr-4 text-amber whitespace-nowrap">◆ PREDATOR</td>
              <td className="py-1 text-text">20 round wins</td>
            </tr>
            <tr>
              <td className="py-1 pr-4 text-red-400 whitespace-nowrap">✦ WARLORD</td>
              <td className="py-1 text-text">50 round wins</td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted font-mono">
        <Link
          href="/battles/koth"
          className="hover:text-amber tracking-[0.18em] uppercase"
        >
          ← arena
        </Link>
        <Link
          href="/battles/koth/history"
          className="hover:text-amber tracking-[0.18em] uppercase"
        >
          past rounds →
        </Link>
      </footer>
    </article>
  );
}
