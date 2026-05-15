/**
 * Specter Sovereign — vignette / protocol / brief copy.
 *
 * Plain text strings rendered into the SHELL palette as monospace
 * output. Authored 2026-05-11 per design freeze with Boss.
 */

export const LISTEN_PROTOCOL = `      ╶  ╶  ╶  ╶  ╶  ╶  ╶  ╶  ╶  ╶

   Four marks you carry. Each is a key in a
   different costume. Strip them to their bare
   form before they can turn the lock.

   ◇ The first was buried in a binary's flesh,
     spoken in five-bit syllables. Translate.

   ◇ The second was forwarded through a swarm.
     Read its echo, not its voice.

   ◇ The third wore a uniform exactly thirteen
     steps from its own.

   ◇ The fourth is yours alone. It wears a mark
     that names what waits behind the gate —
     the lock will not turn while that mark
     is still on.

   Bind the four in the order they came.
   Salt them with your own handle.
   Take the first sixteen of the digest.

   Speak  seal <key>  when you are ready.

   Tools in this shell:
     b32     — translate five-bit syllables
     rev     — read the echo
     rot13   — uniform exactly thirteen steps
     sha256  — make the digest

      ╶  ╶  ╶  ╶  ╶  ╶  ╶  ╶  ╶  ╶`;

export function vignetteSovereign(): string {
  return `        ╔══════════════════════════════════════╗
        ║                                        ║
        ║         S P E C T E R                  ║
        ║         S O V E R E I G N              ║
        ║                                        ║
        ║      ━━━━━━━━━━━━━━━━━━━━━━━           ║
        ║                                        ║
        ║   The shell opens.                     ║
        ║   You are the first through.           ║
        ║                                        ║
        ╚══════════════════════════════════════╝

   The haze is gone from the public shell —
   you took it. It now lives where it belongs:
   wrapped around your name, drifting wherever
   your handle is written across BreachLab.

   Speak  brief  when you are ready to read
   what you have inherited.`;
}

export function vignetteMysterySolved(
  rank: number,
  sovereignUsername: string,
  sovereignClaimedAt: string,
): string {
  return `   The gate recognizes you — but you are not first.

   The first walked here on ${sovereignClaimedAt}.
   @${sovereignUsername} wears the green mantle.

   Your name is logged in the vault's ledger as
   the ${ordinal(rank)} operator to derive the key. You earn
   the  Specter Mystery — Solved  badge, but only
   the first earns the haze.

   Speak  brief  to see what you've earned.`;
}

export function vignetteRejected(attemptsLeft: number): string {
  return `   The gate does not recognize the key.
   Re-bind your fragments. Re-salt with your handle.
   The first sixteen of the digest, not the last.

   [ ${attemptsLeft} attempts left in this cycle.
     cooldown 30s. ]`;
}

export function vignetteCooldown(secondsLeft: number): string {
  return `   The gate is silent for another ${secondsLeft}s.
   Cooldown is per operator. Use the time to re-check
   your work.`;
}

export function vignetteCapped(): string {
  return `   You have exhausted your attempt budget for this
   vault. The gate refuses further keys from this
   operator. Re-derive carefully when the cycle resets.`;
}

export const BRIEF_SOVEREIGN = `═══════════════════════════════════════════════════
   L14 — SPECTER SOVEREIGN
   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
   The hidden door of Specter I
═══════════════════════════════════════════════════

This level has no flag. No SSH chain. No grader.

You worked through Specter I as an analyst and
graduated at L13. But Specter I had one more door —
and only operators who carried four fragments
through the track itself could find it.

You found it.

────────────────────────────────────────────────
WHAT YOU EARNED
────────────────────────────────────────────────

▸ The green haze that used to drift around the
  shell now drifts around your name across the
  whole site. Permanent. Yours.

▸ Specter Sovereign card on your profile —
  signed with the timestamp of your vault entry,
  numbered, sealed.

▸ Your name was announced on the Discord the
  moment the gate opened. The community knows.

────────────────────────────────────────────────
WHAT THIS WAS
────────────────────────────────────────────────

The four-fragment hunt was the first meta-game
in BreachLab. The discipline that found you the
key — patient artifact-reading across four levels
with no in-game prompt — is the same discipline
a seasoned investigator uses on a real case file.

Every Specter sub-track that ships from here will
plant its own hidden door, with its own color.
Watch the shell. When the haze returns in a new
color, the next door has opened.

       — BreachLab Command`;

export const BRIEF_MYSTERY_SOLVED = `═══════════════════════════════════════════════════
   L14 — SPECTER MYSTERY (SOLVED)
   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
   The hidden door of Specter I
═══════════════════════════════════════════════════

You found a level that has no flag, no grader, no
brief in any track listing. You derived the four-
fragment key that opens it. You walked through
the gate.

The Sovereign — the first operator to walk this
path — wears the green haze. That seat is taken.

But you are here. Your name is on the ledger of
the vault. The community knows the gate did not
beat you.

────────────────────────────────────────────────
WHAT YOU EARNED
────────────────────────────────────────────────

▸  Specter Mystery — Solved  badge on your
  profile. Bronze-bordered, signed with the
  timestamp of your vault entry, ranked.

▸ Permanent recognition on the Specter
  Sovereign ledger — every operator who solves
  this puzzle after you will see your handle
  in the seal page's list of derivers.

────────────────────────────────────────────────
WHAT THIS WAS
────────────────────────────────────────────────

The four-fragment hunt was the first meta-game
in BreachLab. Every Specter sub-track that ships
from here will plant its own hidden door, with
its own color. The first operator through each
door wears that door's mantle. You are now on
the list of operators who notice doors.

       — BreachLab Command`;

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
