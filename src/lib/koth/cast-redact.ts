// Redaction layer for the public replay transcript.
//
// The transcript view reads asciinema casts byte-for-byte and surfaces
// every command + its output. That's the educational value — but it
// also leaks arena internals when a player's enumeration commands
// (`find`, `ls`, `cat`) happen to traverse our managed infrastructure.
// Two concrete leaks we observed and need to block:
//
//   1. The decoy mechanic. Lines like `/var/log/breachlab-decoy.log`
//      or `/usr/local/share/breachlab-decoy-stub` reveal that decoy
//      SUID binaries exist as a class — players who read transcripts
//      can then grep `find -perm -4000` output for "decoy" markers and
//      skip them straight away in future rounds.
//
//   2. The drift algorithm. `/usr/local/bin/drift-arena` is the
//      deterministic picker; a single `cat` of that file would dump
//      the entire sha256-keyed POOLS table and let players precompute
//      every round's aliases ahead of time.
//
// Additionally we cap each command's output to MAX_OUTPUT_LINES to
// prevent huge `find /` dumps from drowning the page in noise (and
// in noise that itself may contain another spoiler we missed).

import type { CommandEntry } from "./cast-to-commands";

// Substrings that, if present in a line, mark the line as
// arena-internal and unfit for publication. Matched case-insensitively
// because some players upper/lower-case paths during enumeration.
const REDACT_PATTERNS: readonly RegExp[] = [
  /breachlab-decoy/i,
  /breachlab-decoy-stub/i,
  /drift-arena/i,
  /koth-session-wrap/i,
  /koth-inner-shell/i,
  // The player's own recording directory. Files like
  //   /home/kothN/.koth-rec/20260519T103857Z-12345.cast
  // appear in `find` output and disclose the recording mechanism's
  // on-disk shape (path, timestamp format, .cast.closed convention).
  /\.koth-rec/i,
];

// File-dumping commands. When one of these targets a redacted path
// the whole output is dropped — even if no individual line matches a
// pattern, the bytes of e.g. `strings /usr/local/share/breachlab-decoy-stub`
// would still disclose the decoy's behaviour ("decoy: this binary
// doesn't do what you think it does" is in the binary's strings).
const DUMPER_RE =
  /\b(cat|less|more|head|tail|strings|file|xxd|od|hexdump|nl|tac|rev|awk|sed|grep|base64|tr|cut|fold|wc)\b/;

const MAX_OUTPUT_LINES = 50;

function commandTargetsBlocked(command: string): boolean {
  if (!DUMPER_RE.test(command)) return false;
  return REDACT_PATTERNS.some((re) => re.test(command));
}

function lineRedacted(line: string): boolean {
  return REDACT_PATTERNS.some((re) => re.test(line));
}

function pluralise(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

export function redactCommandLog(entries: CommandEntry[]): CommandEntry[] {
  return entries.map((e) => {
    // Whole-output redaction: `cat /usr/local/bin/drift-arena` etc.
    // The OUTPUT is the leak; the command itself stays so viewers
    // see what was attempted, just not the result.
    if (commandTargetsBlocked(e.command)) {
      return { ...e, output: "[redacted: arena-internal target]" };
    }

    // Line-by-line redaction for things like `find /` that pull in
    // a few internal paths alongside legitimate enumeration output.
    if (!e.output) return e;
    const lines = e.output.split("\n");
    const kept: string[] = [];
    let redacted = 0;
    for (const line of lines) {
      if (lineRedacted(line)) {
        redacted++;
      } else {
        kept.push(line);
      }
    }
    let output = kept.join("\n");
    if (redacted > 0) {
      const suffix = `[redacted: ${redacted} arena-internal ${pluralise(redacted, "line", "lines")}]`;
      output = output ? `${output}\n${suffix}` : suffix;
    }

    // Truncate after redaction so the truncation count reflects what
    // the viewer would actually see.
    const after = output.split("\n");
    if (after.length > MAX_OUTPUT_LINES) {
      const head = after.slice(0, MAX_OUTPUT_LINES);
      const dropped = after.length - MAX_OUTPUT_LINES;
      head.push(
        `[... ${dropped} more ${pluralise(dropped, "line", "lines")}, truncated ...]`,
      );
      output = head.join("\n");
    }

    return { ...e, output };
  });
}
