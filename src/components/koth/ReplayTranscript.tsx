import { castToCommandLog, formatCastTime } from "@/lib/koth/cast-to-commands";
import { redactCommandLog } from "@/lib/koth/cast-redact";

// Server-rendered transcript view of an asciinema cast. Replaces the
// asciinema-player widget on /battles/koth/replay/[id] — Boss's call:
// players don't watch CTF videos, they read commands. Step-by-step
// text is faster to scan, copy-pasteable, works on mobile, doesn't
// stall on sparse casts.
//
// Rendered as a list of <article> entries per command, each with:
//   - `M:SS` timestamp anchor
//   - the command on a single line (multi-line `\` continuations are
//     joined by the parser into one logical command)
//   - optional collapsed output block (auto-expanded for short outputs)

type Props = {
  cast: string;
  /** Slot username for the prompt label (e.g. "koth0"). Cosmetic only. */
  who?: string;
};

const OUTPUT_PREVIEW_LINES = 6;

export function ReplayTranscript({ cast, who }: Props) {
  // Redact arena-internal paths from output + cap long dumps before
  // we hand entries to the renderer. The parser stays neutral; the
  // publication step is what enforces "no spoilers, no internals".
  const entries = redactCommandLog(castToCommandLog(cast));

  if (entries.length === 0) {
    return (
      <div className="border border-border/40 px-4 py-6 text-center text-[12px] font-mono text-muted">
        ▸ no commands parsed from this cast
        <div className="text-[10px] mt-1 text-muted/70">
          Session may have only browsed (no shell prompts) or the cast
          format is non-standard.
        </div>
      </div>
    );
  }

  return (
    <ol
      className="border border-amber/20 divide-y divide-border/40 font-mono text-[12px]"
      data-testid="koth-replay-transcript"
    >
      {entries.map((e, idx) => {
        const outLines = e.output ? e.output.split("\n") : [];
        const collapsed = outLines.length > OUTPUT_PREVIEW_LINES;
        return (
          <li key={idx} className="px-3 py-2.5 space-y-1.5">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-amber/60 tracking-widest tabular-nums select-none">
                {formatCastTime(e.time)}
              </span>
              <span className="text-amber/80 select-none">
                {who ?? "koth"}@arena
              </span>
              <span className="text-amber select-none">{e.prompt}</span>
              <code className="text-text break-all flex-1">{e.command}</code>
            </div>
            {outLines.length > 0 && (
              <div className="pl-2 ml-3 border-l-2 border-amber/15">
                {collapsed ? (
                  <details className="group">
                    <summary className="cursor-pointer text-[11px] text-muted/80 hover:text-amber select-none py-0.5">
                      ▸ {outLines.length} lines of output
                    </summary>
                    <pre className="text-[11px] text-muted whitespace-pre-wrap break-all pt-1 leading-snug">
                      {e.output}
                    </pre>
                  </details>
                ) : (
                  <pre className="text-[11px] text-muted whitespace-pre-wrap break-all leading-snug">
                    {e.output}
                  </pre>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
