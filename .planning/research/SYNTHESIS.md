# Phantom — Research Synthesis

**Date:** 2026-04-14
**Inputs:** 4 parallel research reports (`otw-wargames.md`, `htb-thm-privesc.md`, `pedagogy-pwn-college-portswigger.md`, `modern-privesc-techniques.md`) + last30days community sentiment sweep.

## 1. What we now know (four-way convergence)

Every research angle converges on the same three conclusions:

1. **No existing free wargame teaches 2026 container escape end-to-end.**
   - OTW stops at "you got a shell" (no container content at all).
   - THM Linux PrivEsc (2019) is 0% container.
   - HTB Academy is ~6-8% container, gated behind $8/mo+, all 2019-2021 era, zero Nov-2025 runc CVE coverage.
   - pwn.college Sandboxing dojo is the only close analog pedagogically but teaches chroot→namespace mechanics, not real Docker/K8s escape patterns.
   - **This is Phantom's white space.** Not "more Linux privesc"; specifically *free, end-to-end, 2026-era container escape*.

2. **The architecture is already solved.**
   OverTheWire's 15-year-old model (separate SSH daemon per wargame, password-chain, no shared accounts, terminal-brutalist in-shell) is exactly what Phantom should clone. This is non-negotiable.

3. **The pedagogy problem is also solved, but by PortSwigger, not OTW.**
   OTW's method ("README + shell, figure it out, no hints") works for self-selecting ASU-type cohorts but kills retention for a broader audience. PortSwigger's (visible tiers + 2-4 sentence goal template + ephemeral per-lab target + progress-is-private) is the 2026 winning formula. Phantom must blend OTW's infrastructure with PortSwigger's pedagogy.

## 2. Positioning — one paragraph

> **Phantom is the only free, hardcore, 2026-current, narrative-driven wargame that teaches post-exploitation end-to-end — from `sudo -l` on a hardened Linux host all the way through kubectl-free ServiceAccount token escalation and Leaky Vessels runc escape. It picks up where BreachLab Ghost left a low-priv shell and hands the graduate off to Mirage with AWS IAM credentials from the node's IMDS. HTB Academy costs $11/mo and stops in 2021. TryHackMe is guided past the point of learning. pwn.college is pedagogically perfect but its Sandboxing dojo is chroot-era. OverTheWire doesn't teach any of this at all. Phantom does, and it's free through the container-escape chapter.**

## 3. Design decisions (locked)

### 3.1 Architecture — steal OTW exactly
- Separate SSH daemon: `phantom.breachlab.<tld>:NEW_PORT` (not 2222 which Ghost uses).
- Separate container, separate UID namespace, separate password file.
- Password-chain progression: password for level N+1 lives inside level N's filesystem.
- No shared identity with Ghost. Finishing Ghost does **not** pre-unlock Phantom. Phantom gets its own password for level 0 on its track landing page.
- No cross-track XP. BreachLab platform (the Next.js app) tracks flag submissions per-track independently.
- Track graduation badge (`phantom_master`) awarded on final flag, same mechanism as `ghost_graduate`.

### 3.2 Size — 11 public levels + 1 hidden graduation (12 total)
Matches Behemoth/Utumno in scale. Under Ghost (22 public) because Phantom is deeper per level, not broader. Resist the urge to ship more. Ship Phantom v1 small, then v2/v3 when CVEs rotate.

### 3.3 Level curriculum — 11 P0 techniques (content locked from research #4)

| idx | Tier | Title | Technique (P0 #) | Lesson |
|---|---|---|---|---|
| 0 | Recruit | Know Thyself | — | Recon: `id`/`groups`/`getcap -r /`/`sudo -l`/`find / -perm -4000`. No exploit. Gateway that teaches *the method* of privesc, not one trick. |
| 1 | Recruit | Sudo Allowlist | #1 | NOPASSWD on a GTFOBins binary (`find` or similar). Canonical first real privesc. |
| 2 | Recruit | Wild Card | #3 | Sudo wildcard in argument → tar/rsync/chown injection. |
| 3 | Operator | Preload | #2 | Sudo `env_keep += LD_PRELOAD` → build and preload a `.so`. |
| 4 | Operator | PATH Hijack | #6 | Writable cron script with relative command → drop fake `ls`. |
| 5 | Operator | Capable Binary | #5 | `cap_dac_read_search+ep` on a read utility → exfil `/etc/shadow`. |
| 6 | Operator | Writable Authority | #4 | Writable `/etc/passwd` or `/etc/sudoers.d/*` → direct root. |
| 7 | Operator | You're in a Container | (bridge) | `/proc/1/cgroup`, `/.dockerenv`, `cat /proc/self/status \| grep Cap` realization level. No exploit — detection only. Marks the transition from "host privesc" to "container escape". |
| 8 | Operator | Mounted Socket | #7 | `/var/run/docker.sock` exposed → raw API to spawn `-v /:/host --privileged` sibling → chroot. |
| 9 | Operator | Privileged Flag | #8 | `--privileged` container → `fdisk -l` → `mount /dev/sda1 /mnt/host` → persistence. |
| 10 | Phantom | Leaky Vessels | #9 (CVE-2024-21626) | Malicious OCI `WORKDIR` → fd leak → `/proc/self/fd/<N>` chroot on host. The signature 2026 lab. |
| 11 (hidden) | Phantom | Token of Trust | #11 (signature) | Graduation level: inside a low-priv K8s pod, locate `/var/run/secrets/.../token`, curl the API server, create a privileged pod with `hostPath: /`, nsenter PID 1, write the graduation flag to `/host/proof`. Kubectl-free. This is **the lab Phantom exists for**. |

**Deferred to Phantom v2** (ship later when v1 proves out): runc CVE-2019-5736, cgroup v1 `release_agent`, K8s `privileged + hostPath + hostPID` straight bad-pod escape. All are P0 but v1 keeps level count tight.

**Deferred to future tracks per research scoping**:
- Kernel CVEs (DirtyPipe, nf_tables) → "Kernel Wraith" or similar advanced track.
- AWS/GCP/Azure IAM → **Mirage**.
- Supply chain / malicious images → "Prism".
- eBPF rootkits / detection evasion → **Specter**.

### 3.4 Pedagogy — PortSwigger template, harsher hint policy

**Three visible difficulty tiers, always labeled next to the level title:**
- **Recruit** (3 levels: 0-2) — single primitive, no mitigations, under 15 min.
- **Operator** (7 levels: 3-9) — mitigations on, realistic 2026 defaults, 2-3 step chains. The honest learning zone.
- **Phantom** (2 levels: 10 + hidden 11) — recent-CVE, chained, prestige-grade.

**Hint policy — progressive disclosure, inverted curve:**
- **No hints on Recruit.** Failure = diagnostic, re-read theory.
- **"Show approach" button on Operator**, unlocks after 20 minutes on the level, reveals 2-4 sentences *describing the category of technique*, never commands. Logged per-user.
- **No hints on Phantom.** Discord/community only.

**Goal-writing template (strict):**

Every level's `goal` field in `phantom-level-content.ts` follows this exact shape, max 4 sentences:

```
[1] Framing: "This challenge contains a [privesc class] in [component]. An unprivileged
    user can exploit it to [high-level outcome]."
[2] Win condition: "To solve, read /flag / obtain a root shell / write /host/proof."
[3] Starting context (optional): "You begin as user phantomN. The challenge lives at
    /challenge/..."
[4] Out-of-scope (optional): "You do not need to [kernel exploit / brute force creds]."
```

Hard rules:
- Never name the technique (no "use LD_PRELOAD", no "exploit CVE-2024-21626").
- Never name the tool (no "use `find -exec`").
- Always state the literal win artifact.
- Max 4 sentences. If more needed, split the level.

### 3.5 What Phantom will deliberately NOT do

1. **Not a tutorial site with reading material.** No theory-only pages. Theory is inline in 2-4 sentences per level.
2. **Not a leaderboard platform.** Progress is private. Ghost's speedrun leaderboard is appropriate for a fundamentals track; privesc tracks invite cheating-style metrics that punish careful learners.
3. **Not free-forever on all content.** Free through the container-escape chapter (levels 0-10). The hidden graduation level 11 stays free (it's the hook). Future optional Phantom+ content (kernel, persistence chains) can be donor-gated — matches Plan 07 supporter badge. *(Subject to Boss's later decision; v1 ships fully free.)*
4. **Not guided with answer boxes.** PortSwigger-style unambiguous win conditions, no "enter the exact command you ran" gates.
5. **Not frozen content.** Unlike Narnia, Phantom levels have an explicit mitigation-version header and a v2 rotation policy for CVE-based levels.

### 3.6 Platform-side code scope (what Phantom v1 ships as code)

This is the ONLY code v1 ships. Container-side (ghost-equivalent infra) is operations work, out of scope.

**Content:**
- `src/lib/tracks/phantom-level-content.ts` — 12 LevelContent entries (0..11), mirrors ghost file shape, adds `tier: "recruit" | "operator" | "phantom"` field.
- `scripts/seed-phantom.ts` — 12-entry seed, mirrors seed-ghost.ts with custom pointsBase curve (harder → higher: 300 → 750, level 11 hidden @ 1500).

**Routes:**
- `src/app/tracks/phantom/page.tsx` — track overview (status LIVE, level table, framing prose).
- `src/app/tracks/phantom/[level]/page.tsx` — level detail (mirror of ghost's level detail, adapted for phantom content + tier display).

**Navigation:**
- `src/components/TracksNav.tsx` — flip `phantom: SOON` → `phantom: LIVE`.
- `src/app/page.tsx` — remove "(soon)" marker on Phantom description.

**Badges:**
- `BadgeKind` union + label + gold-variant pill: add `phantom_master`.
- `src/lib/badges/award.ts` + `src/lib/tracks/submit.ts`: detect `(trackSlug === "phantom" && level.idx === 11)` → award `phantom_master` idempotently, same pattern as `ghost_graduate`.
- `src/lib/certificate/queries.ts` + `src/components/certificate/OperativeCertificate.tsx` — generalize to also issue Phantom certificates (route `/u/[username]/certificate?track=phantom`, or second certificate page `/u/[username]/phantom-certificate`). Decision during implementation — prefer generic parameterization.

**Tests:**
- `tests/unit/tracks/phantom-content.test.ts` — verify 12 entries, all have tier field, all goals follow 2-4 sentence rule (programmatically enforced).
- `tests/e2e/phantom-master.spec.ts` — mirror of ghost-graduate.spec.ts, seed + bulk-submit 0..10 + UI-submit 11 + assert badge + certificate page renders.

**Refactor opportunity (optional, defer if tight):**
- Generic `getTrackContent(slug, idx)` routing to ghost/phantom content modules → avoids duplicating `[level]/page.tsx`. Can ship Phantom with a copied page first, generalize later.

### 3.7 Container-side (explicitly OUT of scope)

Phantom SSH container build is operations work:
- 12 `phantomN` users (alpine/debian, bash shell)
- Per-level filesystem layouts (SUID binaries, sudo configs, cron scripts, writable files, `cap_*` on binaries)
- Docker socket exposed for level 8
- Real privileged-container setup for level 9
- OCI config crafted for level 10 (runc Leaky Vessels PoC)
- Nested Kubernetes (kind/k3s) for level 11 ServiceAccount token drill
- Flag files readable only by the right user at each level
- README on level 0 that hands the recruit the first password

Out of scope for code v1 — filed as ops task. When Ghost's container also gets a refresh (old 9-level → new 22-level), Phantom's container is built in the same ops sprint.

## 4. Build order

1. **Write Phantom v1 plan** (bite-sized tasks, per subagent-driven-development discipline).
2. Execute plan on a feature branch.
3. Merge + tag `v0.9.0-phantom`.
4. Update Obsidian changelog.
5. Platform code ready, containers ops-deferred.

## 5. Open questions (defer until during execution)

- Certificate parameterization: one generic `/u/[user]/certificate/[track]` or two separate pages? → decide during Task 8.
- Tier field storage: in DB `levels.tier` column (schema change) or in `phantom-level-content.ts` only (no schema change)? → prefer content-file only, same pattern as `[HIDDEN]` marker. Saves a migration.
- Should Ghost retroactively get tiers? → no. Ghost is fundamentals, tiers add complexity without benefit. Only Phantom.
- Does `phantom_master` also unlock something cross-track? → no. Badges are advertising, not gates.

---

**Bottom line:** Research is conclusive. The gap is real, the architecture is solved, the pedagogy is solved, the technique menu is P0-ranked. Next step is writing the Phantom v1 plan doc and executing it.
