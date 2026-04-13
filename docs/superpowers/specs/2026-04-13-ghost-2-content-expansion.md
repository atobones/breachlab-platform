# Ghost 2.0 — Content Expansion Spec

**Date:** 2026-04-13
**Source:** `CTF Wargames — База Знаний.md` (Bandit full 0-33 analysis)
**Goal:** Grow Ghost from 9 to ~22 levels, covering the full Bandit skill surface adapted for 2026 (cloud, CI, modern tooling, hardcore independence).

## Scope

Ghost currently has 9 levels covering Bandit 0-9. This spec adds 13 new levels (idx 9-21), adapted from Bandit 10-33 but:

- Removing anything that is pure 2010s trivia (e.g. pure ROT13 for the sake of ROT13)
- Replacing Git levels with **CI-adjacent Git forensics** so the skill is directly useful in a 2026 supply-chain world
- Adding a **brute force** level (first scripting!)
- Adding **SSH key auth, cron discovery, SUID teasers** that bridge into Phantom
- Every level tagged with a real-world skill it unlocks — no "this is how you solve a puzzle" framing

Out of scope: the Phantom track (privesc, container escape), the rewrite of the existing Ghost infrastructure containers (that's a separate ops task — this spec is for the **platform-side content** stored in `src/lib/tracks/ghost-level-content.ts` and the companion per-level filesystem layouts to be built on the Ghost container).

## New levels (idx 9-21)

Each entry mirrors the `LevelContent` shape: `goal` (hardcore, no flag hints), `commands` (base tools only), `realWorldSkill` (industry connection).

### Level 9 → Level 10 — "Noise Floor"
**Bandit source:** 7→8 + 8→9 (sort/uniq patterns)
**Goal:** A file full of passwords. Exactly one of them occurs only once. Find the unique one without reading every line.
**Commands:** `sort`, `uniq`, `wc`
**Real-world skill:** Log deduplication at scale. The first tool in the belt of every SIEM engineer who has to find the one anomalous event out of a million identical ones.

### Level 10 → Level 11 — "Binary Strings"
**Bandit source:** 9→10 (strings)
**Goal:** A binary blob. Somewhere inside it there is human-readable ASCII next to a very specific marker. Pull the text out without writing any code.
**Commands:** `strings`, `grep`, `file`
**Real-world skill:** Malware string analysis. Before you reverse a sample you run `strings` to find URLs, flags, and the personality of whoever wrote it.

### Level 11 → Level 12 — "Wrapped Three Deep"
**Bandit source:** 12→13 (multi-layer compression + xxd)
**Goal:** A hex dump. Convert it back. What you get is compressed. Decompress it. What you get is compressed again. Keep peeling until the onion ends. Figure out which tool each layer needs on your own.
**Commands:** `xxd`, `file`, `gzip`, `bzip2`, `tar`
**Real-world skill:** Real malware payloads are nested three or four levels deep to defeat simple sandboxes. This is the exact loop an analyst runs on a fresh sample.

### Level 12 → Level 13 — "Key Not Password"
**Bandit source:** 13→14 (SSH key auth)
**Goal:** There is no password for the next level. There is a private key. Use it. Learn what SSH key authentication actually is and why the world runs on it. For the first time, the user you are logging into is not `ghostN+1` the trivial way — read the hints the filesystem leaves you.
**Commands:** `ssh`, `cat`
**Real-world skill:** Key-based auth is how every production server on the planet is accessed. If you cannot use a private key you cannot do the job.

### Level 13 → Level 14 — "Port 30000"
**Bandit source:** 14→15 (netcat basics, expanded)
**Goal:** A service is listening on a port on localhost. The only way to get the password is to give it something it already knows. The hint lives in a file you can read. Send the thing. Get the password.
**Commands:** `nc`, `curl`
**Real-world skill:** Every production service talks to other services over TCP. Knowing how to hand-craft a request without a client library is the difference between a pentester who finds issues and one who only runs tools.

### Level 14 → Level 15 — "TLS, Not Plaintext"
**Bandit source:** 15→16 (SSL/TLS)
**Goal:** Same idea as the last level, but now the service speaks TLS. Plain netcat will not work. Find a tool that speaks TLS from the command line. Send it what it wants.
**Commands:** `openssl`, `curl`
**Real-world skill:** 99% of traffic on the internet is now TLS. Every real-world recon, every API poke, every banner grab demands a TLS-capable client.

### Level 15 → Level 16 — "Port Range"
**Bandit source:** 16→17 (port scan + protocol detection)
**Goal:** Somewhere in a range of ports, one of them is speaking TLS and will give you a new private key if you say hello. Scan the range. Find the live one. Talk to it. Notice the difference between `connection refused`, `connection timeout`, and `handshake failed` — each one tells you something different about what is on the other side.
**Commands:** `nmap`, `openssl`, `nc`
**Real-world skill:** Discovery is the first step in every engagement. If you cannot tell the difference between a closed port, a filtered port, and an open port speaking an unexpected protocol, you will miss the entry point.

### Level 16 → Level 17 — "Diff"
**Bandit source:** 17→18 (diff)
**Goal:** Two files that look almost the same. The password is the line that differs. Do not read them by eye.
**Commands:** `diff`, `comm`
**Real-world skill:** Code review, config drift detection, forensic comparison of a known-good baseline to a compromised system. `diff` is a core skill of every SOC and DFIR engineer.

### Level 17 → Level 18 — "No Shell For You"
**Bandit source:** 18→19 (.bashrc bypass via ssh command exec)
**Goal:** The previous level's password works, but as soon as you log in, your session is killed. The server runs a `.bashrc` that boots you the moment you arrive. You have to read a file without ever getting an interactive shell.
**Commands:** `ssh`, `cat`
**Real-world skill:** Restricted environments are everywhere in 2026: bastion hosts, container entrypoints, CI runners. Getting useful work done when someone has tried to lock down your shell is core to both attack and defense.

### Level 18 → Level 19 — "Wrong User"
**Bandit source:** 19→20 (SUID binary — Phantom teaser)
**Goal:** You can see a binary that belongs to the next level's user and has strange permissions set on it. Read the manual. Figure out what those permissions mean. Use the binary to read a file your user normally cannot touch.
**Commands:** `ls`, `./`, `cat`
**Real-world skill:** SUID is the single most common Linux privilege escalation path. This is the first taste of what Phantom will cover in depth.

### Level 19 → Level 20 — "Your First Script"
**Bandit source:** 24→25 (brute force PIN)
**Goal:** A service wants both a password you already have and a 4-digit PIN you do not. There are 10,000 possible PINs. Try them all. Write a shell script — this is the level where you stop typing commands one at a time and start writing code that types them for you.
**Commands:** `bash`, `for`, `nc`, `printf`
**Real-world skill:** Every security engineer writes their own tools. You will write more throwaway scripts in a week than you will run someone else's tools. This is the level where that journey starts.

### Level 20 → Level 21 — "Cron Discovery"
**Bandit source:** 21→22 + 22→23 (cron)
**Goal:** Something is running on a schedule. Find what. Find where it writes. Find what it reads. The answer is not in your home directory — it is in the corners of the filesystem where scheduled tasks live.
**Commands:** `ls /etc/cron.d`, `cat`, `find`
**Real-world skill:** Cron is a privilege escalation gold mine and a persistence favorite. Every DFIR engineer checks cron directories in the first 5 minutes of a compromise investigation.

### Level 22 — Hidden Bonus (unlockable only after solving all 22)

**Source:** Preserved from the original BreachLab Ghost concept (`Secret Level 10: .classified → nc localhost 41337`), repurposed as the hidden graduation level now that Ghost has 22 normal levels.

**Access control:**
- Row exists in the `levels` table at `idx = 22` with a `hidden` flag or a special convention (`description` prefix `[HIDDEN]`)
- On `/tracks/ghost`, level 22 is omitted from the public levels table
- On `/tracks/ghost/21`, a short final paragraph hints at the existence of something more without spoiling it
- Only when a user has submitted all 22 public flags (idx 0..21) does the sidebar `TrackLevelsNav` add `Level 22 → ??? [CLASSIFIED]` and `/tracks/ghost/22` stop 404ing
- If an unqualified user navigates directly to `/tracks/ghost/22`, it returns `notFound()` — the level literally does not exist for them

**Narrative:** `GHOST OPERATIVE FINGERPRINT — CLASSIFIED`. The 22 preceding levels were selection. This is graduation. A `.classified` file on the filesystem points at a `nc` service on a non-standard port that asks the graduate one final question (tied to something they should have learned across all 22 levels). The answer yields the final flag.

**Points:** 1000 base, no first-blood bonus (since it's not a race — everyone who earns it took the same road).

**Badge:** A new badge kind `ghost_graduate` is added to `BadgeKind` union. Awarded on successful submission of the level 22 flag. Displayed in gold on the dashboard and public profile.

### Level 21 → Level 22 — "Git Archaeology"
**Bandit source:** 27-31 (git clone / history / branches / tags) — **adapted**: instead of a throwaway local repo we use a realistic secrets-in-history scenario that maps directly to 2026 supply-chain work.
**Goal:** A local git repository was moved from an internal server. It has a dirty history. Somewhere in the log, someone committed something they shouldn't have and then tried to cover it up. Find it. Read it. The full workflow: clone, log, diff, branches, reflog, tags.
**Commands:** `git log`, `git diff`, `git show`, `git branch`, `git reflog`
**Real-world skill:** Git history forensics is the #1 way real-world secrets leak. Every supply-chain attack in 2024-2026 either started here or passed through here. This is the only Bandit-era level that maps directly onto the Nexus (CI/CD) track.

## Migration plan for `src/lib/tracks/ghost-level-content.ts`

Add 13 new entries to `GHOST_LEVEL_CONTENT` keyed 9..21. Existing entries 0..8 stay unchanged. Increase `pointsBase` curve so later levels are worth more:

- idx 0–8: existing `100 + idx * 20` (100..260)
- idx 9–21: `300 + (idx - 9) * 30` (300..660)

This gives a clean run of ~5900 points for a fresh operative — enough headroom that leaderboard rankings stay interesting as we add more tracks later.

## Seed script update

`scripts/seed-ghost.ts` currently seeds 9 `GHOST_LEVELS`. Extend the constant to 22 entries with the new titles below. Flag values keep the same `FLAG{ghost_lN_<random>}` format.

```
0  First Contact
1  Name Game
2  In The Shadows
3  Access Denied
4  Signal in the Noise
5  The Listener
6  Ghost in the Machine
7  Lost in Translation
8  Something's Running
9  Noise Floor
10 Binary Strings
11 Wrapped Three Deep
12 Key Not Password
13 Port 30000
14 TLS, Not Plaintext
15 Port Range
16 Diff
17 No Shell For You
18 Wrong User
19 Your First Script
20 Cron Discovery
21 Git Archaeology
```

## Container-side work (out of this spec)

This spec only covers the platform-side content. Actually making the levels playable on `ghost.breachlab.org:2222` requires building the filesystem layout for each of the 13 new levels on the Ghost container:

- Create `ghost9`..`ghost21` users with bash shells
- Lay out files per level in each home directory
- Wire the level services for 13, 14, 15 (nc listener, TLS listener, port-range scanner target)
- Drop a local git repo for level 21 with a dirty history
- Drop a cron job file for level 20
- Drop a SUID binary for level 18
- Drop a `.bashrc` bypass trap for level 17
- Drop an SSH key and disable password for level 12

Filed as a follow-up operations task after the platform content is merged — deliberately decoupled so the platform-side can be reviewed and merged independently.

## Acceptance

- `GHOST_LEVEL_CONTENT` has 22 entries keyed 0..21
- `scripts/seed-ghost.ts` `GHOST_LEVELS` has 22 entries
- `npm run seed:ghost` seeds all 22 levels with fresh flag values to `.seed-flags.ghost.local.txt`
- `/tracks/ghost/9` through `/tracks/ghost/21` render proper content
- Sidebar `TrackLevelsNav` lists all 22 levels for Ghost
- Level table on `/tracks/ghost` shows all 22 with correct point values
- No existing e2e tests break (badges, tracks, auth, smoke)
