# OverTheWire Wargames — Research for BreachLab "Phantom" Track

**Date:** 2026-04-13
**Purpose:** Understand how OverTheWire (OTW) structures its wargames after Bandit, so BreachLab's second track (Phantom — Linux privesc + container escape) can borrow the right architectural patterns and reject the wrong ones.

## 1. The OTW catalogue at a glance

OTW lists twelve active online wargames plus retired ones. Each wargame is a **separate SSH (or HTTP) service on its own subdomain and port**. There is no unified account, no shared XP, no cross-wargame progression — the password for level N+1 lives inside level N of the *same* wargame. Finishing one wargame unlocks nothing mechanical in the next.

| Wargame    | Focus                                   | Levels | Difficulty | Host : Port | Status |
|------------|-----------------------------------------|--------|------------|-------------|--------|
| Bandit     | Unix/Linux shell fundamentals           | 34     | entry      | bandit.labs.overthewire.org:2220 | Active, maintained |
| Leviathan  | Light reversing / "find the password"   | 8      | 1/10       | leviathan.labs.overthewire.org:2223 | Active |
| Natas      | Server-side web security                | ~34    | web track  | natasX.natas.labs.overthewire.org (HTTP, no SSH) | Active, occasionally updated |
| Krypton    | Classical + early-modern crypto         | 7      | 1/10       | krypton.labs.overthewire.org:2231 | Active, static |
| Narnia     | Binary exploitation 101 (stack, fmtstr) | 10     | 2/10       | narnia.labs.overthewire.org:2226 | Active, frozen at 32-bit / no ASLR |
| Behemoth   | BoF, race, TOCTOU, SUID privesc         | 9      | 3/10       | behemoth.labs.overthewire.org:2221 | Active |
| Utumno     | Intermediate binary exploitation        | 10     | 4/10       | utumno.labs.overthewire.org:2227 | Resurrected from intruded.net, active |
| Maze       | Tricky reversing + exploitation         | 9      | 5/10       | maze.labs.overthewire.org:2225 | Resurrected from intruded.net, active |
| Vortex     | Mixed programming + exploitation        | 27     | hard       | vortex.labs.overthewire.org:5842 | Active, rarely discussed |
| Drifter    | Programming puzzles à la Vortex         | ~15    | hard       | drifter.labs.overthewire.org:2230 | Active, near-dormant |
| Manpage    | Misc manpage puzzles                    | small  | —          | obscure     | Active |
| FormulaOne | Misc                                    | small  | —          | obscure     | Active |
| Semtex     | —                                       | —      | —          | offline     | Offline |
| HES2010, Abraxas, Monxla, Kishi | various               | —      | —          | —           | Retired |

**Takeaway:** The OTW catalogue is less a curriculum and more a museum of donated challenges. Bandit + Natas + Leviathan/Narnia/Behemoth are the actively curated core; Vortex/Drifter/Manpage/FormulaOne are community exhibits that still run but receive little love.

## 2. Per-wargame deep dive

### 2.1 Leviathan — "reversing without reversing"
- **Focus:** Shell + `strings`/`ltrace`/`objdump` to coax passwords out of tiny SUID binaries. No C required.
- **Levels:** 8. Each is a 5–15 minute puzzle.
- **Prereq:** Bandit ~level 15 is enough. Explicitly "no programming experience needed."
- **Feel vs Bandit:** Less hand-holding. Bandit names the technique ("use `find -user`"). Leviathan gives you only the binary and says "there's a password in here." No hint policy.
- **Representative levels:**
  - *leviathan0*: grep a hidden `.backup/bookmarks.html`. Pure shell.
  - *leviathan3*: SUID binary with `strcmp` against a hardcoded string — `ltrace` reveals it.
  - *leviathan5*: SUID binary reads `/tmp/file.log` — symlink trick reads arbitrary files as next user.
- **Community:** Universally recommended as "the gentle bridge from Bandit to Narnia." Criticism: too short.
- **Positioning:** The "I can break a program without reading assembly" appetizer.

### 2.2 Narnia — binary exploitation 101
- **Focus:** Stack smashing, format strings, env-variable shellcode, basic ret2libc. On **32-bit x86, ASLR off, NX off, no canary, source provided**.
- **Levels:** 10. Steep spike at narnia3–6.
- **Prereq:** C, gdb, x86 assembly.
- **Feel:** Pure textbook. Source given so player focuses on *exploit craft*.
- **Representative levels:**
  - *narnia0*: Overwrite a local variable via `gets()` to match a magic value.
  - *narnia3*: File-descriptor confusion — write-then-read ordering lets you read a file you shouldn't.
  - *narnia4*: Env-variable shellcode — stash shellcode in env, jump to it via format-string overwrite.
- **Status:** **Intentionally frozen at 2011-era protections.** Maintainers won't modernize — that would turn it into Behemoth/Utumno.
- **Community view 2024–2026:** Split. Half: "still the best first bof classroom because nothing gets in the way." Other half: "teaches techniques that don't work on any real binary in 2026."
- **Positioning:** Training wheels for stack exploitation — accept the anachronism or skip it.

### 2.3 Behemoth — "Narnia with teeth"
- **Focus:** BoF, format string, race condition, TOCTOU, SUID privesc. **No source code.** First wargame where you must reverse before exploiting.
- **Levels:** 9.
- **Prereq:** Narnia.
- **Representative levels:**
  - *behemoth0*: Strings+ltrace reveals a hardcoded password — Leviathan-ish but stripped.
  - *behemoth2*: TOCTOU race between `access()` and `open()` on a symlink.
  - *behemoth5*: Environment pollution to hijack a relative-path `system()` call.
- **Community:** The "real" first hard wargame. Strong reputation.
- **Positioning:** Where OTW stops being a tutorial and starts being a gauntlet.

### 2.4 Utumno — intermediate pwn
- **Focus:** Heap corruption, integer overflows, exotic memory bugs. Mostly 32-bit; some 64-bit.
- **Levels:** 10. Official 4/10 but community effective 6–7/10 because zero hints.
- **Representative levels:**
  - *utumno0*: Stack bof with a twist — return address must land in a computed shellcode stub.
  - *utumno4*: Integer signedness bug bypasses a size check.
  - *utumno8*: Heap metadata corruption (unlink-style).
- **Status:** Rescued from intruded.net shutdown.
- **Positioning:** Advanced pwn without modern mitigations.

### 2.5 Maze — weird-machine puzzles
- **Focus:** Reversing + exploitation with "tricky and strange" layouts. More puzzle than pwn.
- **Levels:** 9. Difficulty 5/10 (hardest OTW self-rating).
- **Community:** "Fun if you already know pwn; frustrating if you don't."
- **Positioning:** Boss-level, low-volume content.

### 2.6 Krypton — classical crypto
- **Focus:** Caesar → Vigenère → LFSR → toy RSA. Nothing post-2005.
- **Levels:** 7.
- **Positioning:** Crypto history walk, not a crypto course.

### 2.7 Natas — server-side web
- **Focus:** PHP-era LFI, command injection, SQLi, SSRF, weak PRNG, session fixation, XXE, unserialize bugs.
- **Levels:** ~34 — longest non-Bandit wargame.
- **Architecture:** Entirely browser-based, no SSH. Each level is a separate HTTP vhost; source viewable at `index-source.html`.
- **Representative levels:**
  - *natas5*: Cookie-based auth bypass.
  - *natas15*: Blind SQLi against a PHP login.
  - *natas26*: PHP object injection via `unserialize()`.
- **Community:** "Best free intro to web hacking," though clearly PHP-flavored and missing SPA/JWT/GraphQL.
- **Positioning:** The web track. Only real non-SSH architectural pattern in OTW.

### 2.8 Vortex, Drifter, Manpage, FormulaOne
Community-donated, rarely discussed. Vortex: 27 levels mixing programming + exploitation. Drifter: Vortex-adjacent. Manpage/FormulaOne obscure. **None teach privesc or container escape.**

### 2.9 Retired
Semtex, HES2010, Abraxas, Monxla, Kishi — historical stubs.

## 3. Answers to the key architectural questions

**Q1. How strict is wargame separation?** *Total.* Each wargame is its own SSH daemon in its own container, its own UID namespace, its own `/etc/<wargame>_pass/`. Separation is total at infrastructure AND at narrative level.

**Q2. How does OTW guide Bandit finishers?** *It doesn't, really.* Bandit's final page just lists Leviathan/Natas/Krypton as things to try. No enforced order, no launcher. Community folklore converged on Bandit → (Leviathan → Narnia → Behemoth → Utumno → Maze) for pwn, Bandit → Natas for web, Bandit → Krypton for crypto. The graph is deliberately open.

**Q3. Is Narnia being updated for modern protections?** *No, intentionally.* Narnia is preserved as a 32-bit, ASLR-off, source-provided museum. Behemoth/Utumno/Maze are where modern-ish protections appear. 2024–2025 writeups still treat Narnia as a historical first classroom.

**Q4. Narrative framing in later wargames?** *None.* Every wargame is a bare README + level index. No story, no character, no lore. Terminal-brutalist. Even the dramatic names (Leviathan, Utumno, Maze) are just labels.

**Q5. Graduation marker?** *Essentially none.* Bandit's final level prints a congrats message and lists other wargames. The rest just stop — the password for the highest level is the only proof. **No certificate, no final boss, no hidden bonus, no leaderboard, no public completion.** Completion is a private fact between you and your shell history.

## 4. Synthesis for Phantom

### 4.1 Closest structural analog
**Behemoth**, secondarily **Utumno**. Both are explicitly second-track, assume a finished shell-fundamentals wargame, run as a single SSH service on a dedicated port, have 9–10 levels with steep curves, enforce no-hints/no-narrative/raw-SSH. Phantom should be shaped like Behemoth.

Natas is the wrong analog (different protocol, different discipline). Leviathan is too shallow. Narnia is too frozen-in-time.

### 4.2 Patterns to steal
1. **One discipline per wargame.** Phantom teaches only post-exploitation. Do not sneak web or crypto in.
2. **Separate infrastructure per track.** `phantom.breachlab.xyz:PORT` fully distinct from Ghost. Separate container, namespace, password file.
3. **Password-chain progression.** Password for level N+1 lives inside level N. Filesystem-native, resilient, no database/API/auth server.
4. **Open graph between tracks.** Do not force Ghost completion to start Phantom. Let players enter where skill allows.
5. **Terminal-brutalist aesthetic in-shell.** No narrative wrapper. README + shell. Respect the player.
6. **Steep curve, short track.** 9–12 levels. Depth > length.
7. **Frozen-level policy with versioning.** Once a level ships, don't rewrite it — ship a v2. Keeps writeups useful.

### 4.3 Patterns to REJECT (OTW 2011 is not 2026)
1. **Zero telemetry.** Indefensible in 2026. Phantom must record completion (even if invisible to other players) so maintainers know which levels are broken or too hard.
2. **No modernization policy.** "Freeze Narnia at 32-bit forever" is fine for a historical classroom but **fatal for privesc**. Kernel CVEs get patched, capabilities change, cgroup v1→v2. Phantom must stamp each level with a mitigation version and have a rotation plan.
3. **Community-donated graveyard content.** Vortex/Drifter/Manpage show what happens when you accept contributions you can't maintain. Reject content you can't own.
4. **Full marketing-brutalism.** OTW gets away with it because free + 15 years old. A 2026 branded platform can keep in-shell purity while still giving each track a strong landing page, visual identity, and "why this matters" framing. Copy in-shell purity, not the marketing nihilism.
5. **No progression graph.** OTW leaves ordering to folklore. BreachLab should publish an *explicit* recommended path (Ghost → Phantom → …) even if unenforced.
6. **No graduation marker.** Add one. Phantom's finale should produce a verifiable artifact — signed token, certificate hash, hall-of-fame entry. OTW's "you just stop logging in" ending is the weakest part of the whole platform.

### 4.4 Content gap — what NO OTW wargame covers
OTW was designed 2003–2012. **None of its wargames teach:**

- **Container escape:** Docker socket mount, `--privileged`, `/proc` and `/sys` exposure, writable cgroup release_agent, `runc` CVE family, `CAP_SYS_ADMIN` mount tricks.
- **Modern Linux capabilities abuse:** `CAP_DAC_READ_SEARCH`, `CAP_SYS_PTRACE`, `CAP_SYS_MODULE`, `CAP_BPF` — none existed in Bandit's era in their current form.
- **Namespace escape:** user-namespace confusion, shared PID namespace, `/proc/*/root`.
- **systemd / D-Bus / Polkit privesc:** pwnkit (CVE-2021-4034) family — nothing in OTW.
- **Cgroup v2 + eBPF tricks.**
- **Kernel exploitation on hardened kernels:** KASLR, SMEP/SMAP, KPTI. Utumno ignores all of this.
- **Cloud-metadata privesc:** IMDSv1 SSRF → AWS creds → lateral. Entirely outside OTW's world.
- **Persistence on a compromised host:** malicious systemd units, LD_PRELOAD rootkits, cron hijack, sudoers edge cases. Behemoth grazes this; nothing covers it cleanly.
- **Container runtime differences:** Docker vs Podman vs containerd vs Kata vs gVisor. Important in 2026, nonexistent in OTW.

**This is Phantom's white space.** The entire market of free SSH wargames stops at "you got a shell." Phantom's thesis — "okay, you got a shell, now what?" — is genuinely uncovered.

## 5. Concrete recommendations for Phantom v1

1. **Architecture:** Copy OTW exactly — `phantom.breachlab.xyz:PORT`, separate SSH daemon, separate container, password-chain progression, no shared identity with Ghost.
2. **Size:** 10–12 levels. Match Behemoth/Utumno. Resist shipping 30.
3. **Discipline purity:** Post-shell only. Every level assumes you *already* have a low-priv shell — that's the premise, never a puzzle.
4. **Curriculum spine (draft):**
   - L0–L2: Classic Linux privesc (sudo misconfigs, SUID, PATH hijack, cron). Cover the basics OTW half-covers in Behemoth.
   - L3–L5: Capabilities + namespaces. Modern post-2015 material OTW totally misses.
   - L6–L8: Container escape (Docker socket, privileged, release_agent, /proc tricks).
   - L9–L10: Kernel-adjacent — eBPF abuse, module loading via CAP_SYS_MODULE, pwnkit-style logic bug.
   - L11 finale: Chained escape — unprivileged container → capability abuse → host root → signed "you finished Phantom" artifact.
5. **Reject OTW's weaknesses:** Add graduation marker, add telemetry, publish explicit Ghost→Phantom path, commit to a rotation schedule for levels whose CVEs get mitigated out of existence.
6. **Own the white space:** Container escape + modern capabilities are the marketing hook. No free SSH wargame teaches these end-to-end. That is Phantom's reason to exist.
