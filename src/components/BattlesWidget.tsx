import Link from "next/link";

const cardBody = (
  <>
    <div className="flex items-center gap-1.5 mb-1.5 font-mono font-bold">
      <span className="text-amber">RvB</span>
      <span className="text-muted">·</span>
      <span className="text-red-400">KoTH</span>
      <span className="text-muted">·</span>
      <span className="text-blue-400">A/D</span>
    </div>
    <div className="text-muted leading-snug">
      3 PvP modes — plant, hold the crown, or full attack-defense.
    </div>
    <div className="text-[10px] text-amber/70 mt-1.5 group-hover:text-amber">
      [enter →]
    </div>
  </>
);

// No display utility in cardClasses — the wrappers decide block vs hidden
// per viewport. Avoids `block` colliding with `hidden` from the variant.
const cardClasses =
  "border border-amber/30 bg-amber/5 p-2.5 text-xs hover:bg-amber/10 hover:border-amber/70 transition-colors group";

// At ultrawide (3xl), the Battles surface lives in the Ops Wall rail
// permanently, so the sidebar widget would be redundant — hide it there.
export function BattlesWidget() {
  return (
    <section className="3xl:hidden">
      <h2 className="text-muted text-sm uppercase mb-2 flex items-center gap-2">
        ▸ Battles
        <span className="text-[9px] text-amber/80 border border-amber/40 px-1 rounded uppercase tracking-wider">
          soon
        </span>
      </h2>
      <Link href="/battles" className={`block ${cardClasses}`}>
        {cardBody}
      </Link>
    </section>
  );
}
