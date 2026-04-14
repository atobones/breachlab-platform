# Pedagogy Transfer Study — pwn.college & PortSwigger Web Security Academy

**Purpose:** Extract teaching methodology (not content) from the two most widely respected free structured security education platforms, and translate it into concrete design rules for BreachLab's "Phantom" track (Linux privesc + container escape).

**Research method:** WebSearch across pwn.college, portswigger.net, Reddit, the SIGCSE 2024 paper "Enter the DOJO" (Nelson/Shoshitaishvili), plus prior knowledge. WebFetch was unavailable in this session; all claims below are cross-referenced against at least one public source.

---

## Part 1 — pwn.college

### 1.1 Dojo catalog (as of 2024-2025)

pwn.college organizes content into **dojos** (courses) → **modules** → **challenges** (individual levels). Completing defined dojo sets earns **belts**: white → yellow → blue (physical embroidered belts shipped on blue).

Dojos most relevant to Phantom:

| Dojo | Relevance | Notes |
|---|---|---|
| **Linux Luminarium** | High (foundations) | Absolute-beginner Linux: shell, processes, permissions, pipes, man. Pure hands-on. Assumes zero knowledge. |
| **Computing 101** | Medium | Architecture, assembly, memory — prerequisite mental models. |
| **Program Security** | Medium | Shellcoding, memory corruption. Shares the "drill the primitive" pattern. |
| **System Security → Kernel Security** | **Very high** | Challenges run inside per-user VM (`vm start`); student interacts with a loaded kernel module, escalates user→root via buggy kernel interfaces. Ladder: crackme → IOCTL recon → shellcode-in-kernel privesc. |
| **System Security → Sandboxing** | **Highest** | Direct analogue for container escape. Progression: chroot escape → parent/child IPC jail escape → modern namespace-based sandbox escape. Pedagogically the exact shape of Phantom's escape arc. |
| **System Security → System Exploitation** | Medium | Advanced userland. |
| **Software Exploitation** | Low-Medium | Modern mitigations; mostly pwn, not privesc. |

The **SIGCSE 2024 paper "Enter the DOJO"** (Nelson & Shoshitaishvili) is the authoritative statement of the method and the single best source for anyone designing a Phantom-style platform.

### 1.2 Mechanics of a pwn.college challenge

- **Delivery unit:** a single Linux challenge directory (`/challenge`) containing an executable that holds the flag. Student must exploit/manipulate it to print the flag.
- **Flag format:** `pwn.college{...}` CTF-style. Submitted in a web box to mark the level complete.
- **Environment:** browser-delivered Linux workspace (ttyd + VSCode-in-browser). No download, no VM setup. Kernel challenges spin a nested VM via `vm start`. This zero-install property is load-bearing for reach (145 countries cited by ASU).
- **Difficulty curve per module:** ~10-30 levels. First level near-trivial (tooling sanity check). Last levels combine primitives.
- **Lectures:** short recorded videos (Shoshitaishvili) paired with each module. Paper explicitly frames them as a *starting point*: "the challenge problems are the active educational component; lectures only give you a place to start."
- **Hint policy:** **no hints from the platform.** No "show solution" button, no stepped hints. Help lives in Discord (peers + TAs). Frustration is part of the method.
- **Grading:** binary, automated, flag-based. No writeup, no code review, no peer grading. Per-dojo leaderboards create social pressure; belts are the long-horizon reward.
- **Module shape:** (1) short lecture → (2) trivial "hello" level forcing tooling contact → (3) 5-15 incremental levels, each adding exactly one new idea → (4) 2-5 capstone levels combining everything.

### 1.3 Sentiment (Reddit/HN/ASU 2024-2026)

- **"Best free offensive-security training that exists"** — especially for binary exploitation. Only rival commonly named is paid HTB Academy.
- **"Brutal but fair"** — steep ramp, no handholding. Stickers report transformation; dropouts report burnout.
- **Browser-native environment is universally praised** — no "install this VM/plugin/toolchain" friction that kills OSCP/THM.
- **Main criticism:** sparse docs, reliance on Discord, no-hints philosophy can trap a learner for days.

---

## Part 2 — PortSwigger Web Security Academy

Different subject (web app sec), but the **instructional architecture** is what earns the "best free course on the planet" reputation.

### 2.1 Top-level structure

- **Topics:** SQLi, XSS, CSRF, SSRF, access control, auth, prototype pollution, request smuggling, etc. ~35 topics in 2025.
- Every topic has the same five-part shape:
  1. **Theory article** — medium-length, covers "what / how it works / how to find / how to prevent." No spoilers for any lab.
  2. **Interactive labs** — each targeting *one* specific variant. Tiered difficulty.
  3. **"Show solution" button** — stepped walkthrough, available, socially discouraged.
  4. **Community solutions link** — YouTube/blog.
  5. **Back-references** — theory article inlines links to each relevant lab at the exact point the variant is introduced.

### 2.2 Difficulty tiers (the famous part)

Three named tiers, always visibly labeled next to every lab title:

- **Apprentice** (~50 labs) — single primitive, no chaining, minimal mitigations. Goal: see the concept work in your hands.
- **Practitioner** (~131 labs) — mitigations on; 2-3 step chain, filter bypass, or non-obvious attack surface. Dominates the content.
- **Expert** (~30 labs) — research-grade, often derived from PortSwigger's own Black Hat talks (e.g. HTTP/1 Must Die labs from BH 2025). Low completion, prestige marker.

Students cite the three-tier model as the single most motivating feature: Apprentice gives dopamine, Practitioner is the honest learning zone, Expert is aspirational.

### 2.3 Learning paths vs. topic browse

- **Learning path** — curated linear sequence, mapped to **Burp Suite Certified Practitioner (BSCP)** exam. "Tell me exactly what to do next" mode.
- **All topics** — free browse, depth-first.
- Both share the same labs; progress tracked globally per account.

### 2.4 Lab description style (the template to steal)

PortSwigger lab descriptions are famously tight — **2-4 sentences, no fluff, no spoilers**, structured as:

> **1 — Framing:** "This lab contains a [vulnerability type] in the [feature], which you can exploit to [high-level outcome]."
> **2 — Constraint / win condition:** "To solve the lab, [concrete win condition]."
> **(3) — Credentials / scope:** "You can log in to your own account using the following credentials: `wiener:peter`."
> **(4) — Out-of-scope:** "You do not need to perform [X] to solve this lab."

Discipline: state the bug class, state the concrete victory condition, give minimum starting context, **never hint at technique**. Learner always knows what "done" looks like, never how to get there.

### 2.5 Environment model

- **Shared Burp client** — learner runs Burp Community locally.
- **Per-lab ephemeral target** — each lab spins an isolated vulnerable site on `*.web-security-academy.net`, ~30 min lifetime.
- This hybrid — shared student tooling + isolated per-lab target — is arguably the biggest reason the platform scales to millions cheaply.

### 2.6 Progress, completion, motivation

- Binary per-lab state (solved / not). No partial credit.
- Persistent per-account tracking with visible "X/50 Apprentice, Y/131 Practitioner, Z/30 Expert" bars.
- **No leaderboards, no points, no belts** — progress is private. Sentiment data suggests learners *prefer* this; it removes the "feeling behind" demotivator that kills CTF platforms.
- BSCP exam is the one optional paid capstone, giving the whole free ladder an external endpoint.

### 2.7 Why learners call it "best free course on the planet"

1. Content updated from real research (BH talks → labs in months).
2. Theory and practice welded together — never read about a bug without immediately exploiting one.
3. Zero friction — no install, no account wall on theory.
4. Tiered difficulty is honest — nothing labeled "beginner" that actually needs 40 hours.
5. "Show solution" exists but is socially shamed — preserves learning while preventing permanent stalls.

---

## Part 3 — Methodology transfer to Phantom

### 3.1 What Phantom should adopt from pwn.college

1. **Dojo-sized granularity.** Ship a Linux Luminarium-style "Phantom Primer" assuming nothing — fds, SUID, PATH, capabilities, namespaces. Each concept = its own micro-module.
2. **Challenge = isolated artifact + flag.** Every level is a concrete `/challenge` the learner attacks to surface a flag. No writeups, no code submission. Binary auto-grading is the only gate.
3. **Browser-delivered Linux environment is non-negotiable.** The reason pwn.college reaches 145 countries and HTB/OSCP don't. One-click kernel-capable shell (kata/firecracker/gVisor per user) or Phantom is a tutorial site, not a wargame.
4. **Ladder-of-one: each level changes exactly one variable.** Crackme → mitigation off → same attack with mitigation on → chain with a second primitive. Non-obvious discipline from the SIGCSE paper.
5. **Capstone levels at the end of every module** that force re-use of all module primitives. This is where transfer learning happens.
6. **Community, not hints.** Ship Discord/Matrix from day one. The answer to "I'm stuck" is "#phantom-help" — not a button.

### 3.2 What Phantom should adopt from PortSwigger

1. **Named, visible difficulty tiers.** Label every level. Learners self-select; beginners feel protected; advanced users have aspirational targets.
2. **Theory article ↔ lab marriage.** One short prose explainer per module with inline links to each level at the point the concept is introduced. No theory-only pages, no lab-only pages.
3. **Tight objective writing template** (exact rule below).
4. **Per-lab ephemeral target, shared student tooling.** Learner's persistent Linux shell + isolated victim spun per challenge.
5. **Progress is private.** Resist leaderboards. Per-account "X/Y solved per tier" bars only.
6. **Plan an external capstone.** A "Phantom Operator" cert-style exam gives the whole ladder a finish line. Without one, content is infinitely scrollable and nobody finishes.

### 3.3 Concrete design proposals for Phantom

**Difficulty tiers — RECOMMENDATION: visible, named, three tiers.**

Invisible difficulty (Bandit/pwn.college) only works with cult-like intrinsic motivation. BreachLab's audience is broader. Adopt PortSwigger's visible-tier model:

- **Recruit** — single primitive, mitigations off, reachable in <10 min if you know the concept. ~40% of content.
- **Operator** — mitigations on, 2-3 step chain, realistic Linux hardening. ~50% of content. Honest-learning tier; should dominate.
- **Phantom** — novel chains, recent-CVE-flavored, capstone-grade. ~10%. Prestige.

**Hint policy — RECOMMENDATION: two-stage progressive disclosure + hard community floor.**

- **No hint button on Recruit.** Failure here is diagnostic — re-read the theory.
- **Single "Show approach" button on Operator**, revealing 2-4 sentences describing the *category of technique* (not commands). Unlocks only after 20 minutes on the level.
- **No hints on Phantom.** Community Discord only.

Harsher than PortSwigger (no full solutions), gentler than pwn.college/Bandit (nothing). Reflects that Phantom learners are more heterogeneous than ASU undergrads but more committed than casual web-sec dabblers.

**Goal-writing template (adapted directly from PortSwigger):**

Every Phantom level description is **2-4 sentences** and follows this exact shape:

> **[1] Framing (required):** "This challenge contains a [privesc class / misconfiguration / escape surface] in [component]. An unprivileged user can exploit it to [high-level outcome]."
>
> **[2] Win condition (required):** "To solve the challenge, read `/flag` / obtain a root shell on the host / escape the container and write to `/host/proof`."
>
> **[3] Starting context (optional):** "You begin as user `recruit` with credentials `recruit:recruit`. The challenge binary lives at `/challenge/run`."
>
> **[4] Out-of-scope note (optional):** "You do not need to exploit the kernel to solve this challenge." / "Brute-forcing credentials is not the intended path."

**Hard rules:**
- Never name the technique (no "use CVE-2022-0847 / Dirty Pipe").
- Never name the tool (no "use `find -exec`").
- Always state the literal win artifact (path, file, shell, network callback). Learner must always know what "done" looks like.
- Max 4 sentences. If it needs more, the challenge is under-scoped — split it.

### 3.4 Hard-truth — what Phantom should NOT copy

**From pwn.college: do not copy "no hints, figure it out or quit" ideology.**
pwn.college can afford this because its audience is self-selecting ASU CS students and hardcore CTF regulars — people who grind 20 hours on one level as a badge of honor. BreachLab's Phantom audience is a superset: working sysadmins, red teamers in training, curious devs. The pwn.college dropout rate would kill Phantom's funnel. Adopt the *shape* (challenge-driven, community-supported) but keep progressive disclosure on Operator tier.

**From PortSwigger: do not copy full-text "Show solution" walkthroughs.**
PortSwigger's labs are each bespoke web apps — one walkthrough rarely generalizes. Linux privesc is different: one full walkthrough of "exploit a writable PATH" collapses every future writable-PATH level. Show *approach category*, never commands.

---

## Part 4 — TL;DR for Phantom product/content team

1. **Architecture:** browser-delivered persistent Linux shell + per-challenge ephemeral victim. Non-negotiable.
2. **Unit:** one challenge = one `/challenge` binary or env, one `/flag` to capture. Binary auto-grading only.
3. **Module shape:** short written theory → "hello" sanity level → 8-15 ladder levels (one new variable each) → 2-3 capstone combinations.
4. **Tiers:** Recruit / Operator / Phantom, always visible, ~40/50/10 by volume.
5. **Hints:** none on Recruit, one "approach" reveal on Operator after 20 min, none on Phantom. Discord is the real help channel.
6. **Descriptions:** 2-4 sentences, PortSwigger template, spoiler-free, win condition literal.
7. **Progress:** private, per-tier counters, no leaderboards, optional external capstone exam.
8. **Do not copy:** pwn.college's zero-hint ideology; PortSwigger's full-walkthrough button.

---

## Sources

- pwn.college + Linux Luminarium + Kernel Security + Sandboxing + Program Security + Software Exploitation
- SIGCSE 2024 "Enter the DOJO" — Nelson & Shoshitaishvili
- ASU News 2024 coverage
- PortSwigger Web Security Academy — all topics, learning paths, BSCP prep
- PortSwigger Academy reviews (Class Central, HelpNet Security, Matt Schmidt)
