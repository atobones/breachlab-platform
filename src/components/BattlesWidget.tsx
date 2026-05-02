import Link from "next/link";

export function BattlesWidget() {
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2 flex items-center gap-2">
        ▸ Battles
        <span className="text-[9px] text-amber/80 border border-amber/40 px-1 rounded uppercase tracking-wider">
          soon
        </span>
      </h2>
      <Link
        href="/battles"
        className="block border border-amber/30 bg-amber/5 p-2.5 text-xs hover:bg-amber/10 hover:border-amber/70 transition-colors group"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-red-400 font-mono font-bold">RED</span>
          <span className="text-muted">vs</span>
          <span className="text-blue-400 font-mono font-bold">BLUE</span>
        </div>
        <div className="text-muted leading-snug">
          Red plants persistence. Blue hunts it down.
        </div>
        <div className="text-[10px] text-amber/70 mt-1.5 group-hover:text-amber">
          [enter →]
        </div>
      </Link>
    </section>
  );
}
