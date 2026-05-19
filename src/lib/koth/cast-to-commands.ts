// Convert an asciinema v2 cast file into a structured list of
// commands the player ran, with their output. This is the data the
// transcript view in /battles/koth/replay/[id] renders — Boss explicitly
// chose this over a video-style player: easier to scan, copy-paste-able,
// works on mobile, and doesn't depend on asciinema-player playing nice
// with sparse casts.
//
// Format we expect: JSONL where line 0 is the header object and each
// subsequent line is `[time:number, "o"|"i", data:string]`. We only
// look at "o" (output) events — bash echoes user input back through
// the pty, so the typed command appears in the output stream right
// after the prompt.
//
// Algorithm:
//   1. Read every output event in order. Strip ANSI/OSC controls.
//   2. Concatenate into a single buffer, remembering for each char
//      which event time it came from.
//   3. Walk the buffer with a regex matching the bash prompt
//      (`<user>@<host>:<cwd>$ ` or `# ` for root). For each match,
//      the text from the prompt's end up to the first \r/\n is the
//      command (joining bash `\` continuations on subsequent
//      `> `-prefixed lines). Text after the command's newline up to
//      the next prompt is the command's output.

export type CommandEntry = {
  /** Seconds from cast start when the prompt for this command appeared. */
  time: number;
  /** Bash prompt symbol shown to the player (`$` for user, `#` for root). */
  prompt: string;
  /** The command line the user typed, joined across `\` continuations. */
  command: string;
  /** Output emitted between the command's newline and the next prompt. Trimmed. */
  output: string;
};

const ANSI_CSI = /\x1b\[[0-?]*[ -/]*[@-~]/g;
const ANSI_OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const ANSI_OTHER = /\x1b[NOP\\]/g;
const BRACKETED_PASTE = /\x1b\[\?\d+[hl]/g;

// Match a bash-style prompt anywhere in the buffer. The user/host/cwd
// part is optional so the regex also catches just `$ ` if a previous
// chunk only emitted the symbol. `g` so we can iterate every match.
const PROMPT_RE = /(?:[\w.+-]+@[\w.+-]+:[^\s$#]*)?([$#])\s/g;

function stripAnsi(s: string): string {
  return s
    .replace(ANSI_OSC, "")
    .replace(ANSI_CSI, "")
    .replace(ANSI_OTHER, "")
    .replace(BRACKETED_PASTE, "")
    // Backspace handling: `x\b` erases the preceding char.
    .replace(/.\x08/g, "");
}

type FlatChunk = { time: number; text: string };

function castToFlat(cast: string): FlatChunk[] {
  const out: FlatChunk[] = [];
  const lines = cast.split("\n");
  // Skip header (line 0).
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (
      !Array.isArray(parsed) ||
      parsed.length < 3 ||
      parsed[1] !== "o" ||
      typeof parsed[0] !== "number" ||
      typeof parsed[2] !== "string"
    ) {
      continue;
    }
    const cleaned = stripAnsi(parsed[2]);
    if (cleaned.length === 0) continue;
    out.push({ time: parsed[0], text: cleaned });
  }
  return out;
}

function buildBuffer(flat: FlatChunk[]): {
  buf: string;
  offsets: number[]; // offsets[i] = char index where flat[i]'s text starts
} {
  let buf = "";
  const offsets: number[] = [];
  for (const c of flat) {
    offsets.push(buf.length);
    buf += c.text;
  }
  return { buf, offsets };
}

function timeAt(
  flat: FlatChunk[],
  offsets: number[],
  charIdx: number,
): number {
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (offsets[mid] <= charIdx) lo = mid;
    else hi = mid - 1;
  }
  return flat[lo]?.time ?? 0;
}

// Join bash `\`-continuations: while the next line starts with "> "
// (PS2), strip the prefix and concatenate.
function joinContinuations(commandLine: string, remaining: string[]): {
  command: string;
  consumed: number; // how many lines we ate
} {
  let cmd = commandLine.trimEnd();
  let consumed = 0;
  while (cmd.endsWith("\\") && consumed < remaining.length) {
    const next = remaining[consumed];
    const m = next.match(/^>\s?(.*)$/);
    if (!m) break;
    cmd = cmd.slice(0, -1).trimEnd() + " " + m[1].trimEnd();
    consumed++;
  }
  return { command: cmd, consumed };
}

export function castToCommandLog(cast: string): CommandEntry[] {
  const flat = castToFlat(cast);
  if (flat.length === 0) return [];

  const { buf, offsets } = buildBuffer(flat);

  // Collect every prompt position. Each tuple is [start, end, symbol]
  // where `end` is the offset right after the trailing space, i.e.
  // the start of the command.
  type PromptHit = { start: number; end: number; sym: string };
  const hits: PromptHit[] = [];
  let m: RegExpExecArray | null;
  PROMPT_RE.lastIndex = 0;
  while ((m = PROMPT_RE.exec(buf)) !== null) {
    // Defensive: prompts only count when they appear at start of
    // buffer or right after a newline (otherwise a `$ ` inside output
    // text would be misread as a prompt).
    if (m.index !== 0 && buf[m.index - 1] !== "\n" && buf[m.index - 1] !== "\r") {
      continue;
    }
    hits.push({
      start: m.index,
      end: m.index + m[0].length,
      sym: m[1],
    });
  }
  if (hits.length === 0) return [];

  const entries: CommandEntry[] = [];
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    const sliceEnd = i + 1 < hits.length ? hits[i + 1].start : buf.length;
    const after = buf.slice(h.end, sliceEnd);
    // First \r/\n in `after` separates command from output.
    const nlMatch = after.search(/[\r\n]/);
    let rawCommand: string;
    let rawOutput: string;
    if (nlMatch === -1) {
      // Trailing prompt with no Enter — empty command, no output.
      rawCommand = after;
      rawOutput = "";
    } else {
      rawCommand = after.slice(0, nlMatch);
      rawOutput = after.slice(nlMatch).replace(/^[\r\n]+/, "");
    }
    // Split the remaining output by \r?\n and try to join `\`
    // continuations into the command.
    const outLines = rawOutput.split(/\r?\n/);
    const joined = joinContinuations(rawCommand, outLines);
    const command = joined.command.trim();
    const outputLines = outLines.slice(joined.consumed);
    const output = outputLines.join("\n").replace(/^\s+|\s+$/g, "");

    if (command.length === 0) continue;

    entries.push({
      time: timeAt(flat, offsets, h.start),
      prompt: h.sym,
      command,
      output,
    });
  }

  return entries;
}

/**
 * Compact `M:SS` timestamp for a second offset.
 */
export function formatCastTime(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
