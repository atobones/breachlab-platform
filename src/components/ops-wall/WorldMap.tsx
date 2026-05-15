// Static ASCII world map rendered as the center-piece of the Ops Wall.
// Phase-1 deliberately omits per-IP geo data — the dots are seeded from a
// stable layout and animate via CSS to imply activity without exposing
// player locations. Real geo overlay is a follow-up if/when ops want it.

const MAP = `
        _____                                                      _____
   ___ /     \\___       ___                                ___    /     \\___
  /   /  N.AM  \\  \\___  /   \\___                       __/   \\__ /  EURO    \\___
  \\__/         \\__/   \\/      \\__                    _/         \\__   ASIA    \\__
   /            /            __/                __/                \\           /
   |           |            /                  /                    \\         /
   \\___        \\___        /_                 |                      \\_______/
       \\           \\____    \\_                |                            \\
        \\_              \\     \\__             \\___                          \\____
          \\__   S.AM     \\_     \\___              \\____                          \\
             \\__           \\___      \\____             \\__                        \\
                \\__           \\           \\____           \\_                       \\__
                   \\__         \\_              \\____        \\__   AUSTRALIA      __/
                      \\__        \\                  \\___       \\______        __/
                         \\________\\                      \\___          \\____ /
`;

// Dot positions are virtual "pulses" on the wall — not geographically real,
// just visual rhythm. CSS handles the pulse animation; numbers are anchors.
const DOTS = [
  { top: "16%", left: "18%" },
  { top: "22%", left: "24%" },
  { top: "20%", left: "47%" },
  { top: "26%", left: "62%" },
  { top: "24%", left: "75%" },
  { top: "44%", left: "20%" },
  { top: "52%", left: "26%" },
  { top: "38%", left: "70%" },
  { top: "70%", left: "82%" },
];

export function WorldMap() {
  return (
    <div className="border border-amber/20 p-3 flex flex-col min-h-0 min-w-0">
      <div className="flex items-center gap-2 text-[11px] mb-2">
        <span className="text-amber">[ GLOBAL THEATRE ]</span>
        <span className="text-muted">— ops activity (illustrative)</span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <pre className="text-amber/60 text-[10px] leading-[1.15] m-0 select-none whitespace-pre">
          {MAP}
        </pre>
        {DOTS.map((d, i) => (
          <span
            key={i}
            className="ops-wall-dot"
            style={{
              top: d.top,
              left: d.left,
              animationDelay: `${(i * 0.7) % 4}s`,
            }}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
