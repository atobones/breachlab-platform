import Link from "next/link";

// Battles is brainstorm-stage (RvB / KoTH / A-D). This view is the
// pre-launch teaser surface served inside the Ops Wall on ultrawide
// screens when the Battles link in the sidebar is clicked. The matching
// CSS rule (`#ops-rail-battles:target`) flips the default rail off and
// this one on — no JS, no client state, route stays at `/`.

type Mode = {
  glyph: string;
  name: string;
  tagline: string;
  format: string;
  cadence: string;
  signups: number; // placeholder count until a real `battle_interest` table lands
};

const MODES: Mode[] = [
  {
    glyph: "⚔",
    name: "Red vs Blue",
    tagline: "Plant the flag. Hold ground.",
    format: "Asymmetric live attack / defense · 3 ops per side · 30-min rounds",
    cadence: "queue opens with first wave",
    signups: 14,
  },
  {
    glyph: "♛",
    name: "King of the Hill",
    tagline: "One box. Many operators. Last one alive holds it.",
    format: "Free-for-all on a single rotating target · 8-min rounds",
    cadence: "queue opens with first wave",
    signups: 8,
  },
  {
    glyph: "⊕",
    name: "Attack / Defense",
    tagline: "Build and break in parallel.",
    format:
      "Asynchronous 24h round · your service must stay up while you break theirs",
    cadence: "queue opens with first wave",
    signups: 4,
  },
];

export function BattlesRail() {
  return (
    <section
      id="ops-rail-battles"
      className="ops-rail-battles border border-amber/30 flex-col min-h-0"
    >
      <header className="flex items-center justify-between px-3 py-2 border-b border-amber/20 shrink-0">
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-amber">[ BATTLES — RECRUITMENT ]</span>
          <span className="text-muted">launching with first full wave</span>
        </div>
        <a
          href="#"
          className="text-[11px] text-muted hover:text-amber transition-colors no-underline"
        >
          ← close
        </a>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
        {MODES.map((m) => (
          <div
            key={m.name}
            className="border border-amber/20 p-4 flex gap-4 hover:bg-amber/[0.03] transition-colors"
          >
            <div className="text-amber text-3xl leading-none shrink-0 w-8 text-center">
              {m.glyph}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-amber text-sm uppercase tracking-wider">
                  {m.name}
                </span>
                <span className="text-[11px] text-text/80">{m.tagline}</span>
              </div>
              <div className="text-[11px] text-muted leading-relaxed">
                {m.format}
              </div>
              <div className="flex items-center gap-4 mt-1 text-[10px]">
                <span className="text-muted uppercase tracking-wider">
                  {m.cadence}
                </span>
                <span className="text-amber/30">·</span>
                <span className="text-amber tabular-nums">
                  {m.signups} operatives signed up
                </span>
              </div>
            </div>
          </div>
        ))}

        <div className="border-t border-amber/10 pt-3 flex items-center justify-between text-[11px]">
          <span className="text-muted">
            register interest — first wave gets free entry to all three modes
          </span>
          <Link
            href="/battles"
            className="text-amber hover:underline no-underline"
          >
            [ REGISTER → ]
          </Link>
        </div>
      </div>
    </section>
  );
}
