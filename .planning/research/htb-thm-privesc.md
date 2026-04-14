# HTB vs THM: How the Big Two Teach Linux Privesc & Container Escape

Research date: 2026-04-13
Method: WebSearch (WebFetch denied). Platform section lists reconstructed from forum threads, the buduboti/CPTS-Walkthrough repo, Medium writeups, and third-party reviews rather than direct scrape of gated course pages.

## 1. HackTheBox

### 1.1 HTB Academy — "Linux Privilege Escalation" module
- URL: https://academy.hackthebox.com/course/preview/linux-privilege-escalation
- Tier: Easy / Tier II. ~33 sections. Part of CPTS path + "Local Privilege Escalation" skill path.
- Access: preview free; full module needs Cubes or subscription. Student $8/mo (with .edu) unlocks all Tier II. Silver annual / VIP+ also cover it. After Oct-2025 the cheap VIP tier was removed; effective floor rose ~$11/mo.
- Topic coverage (reconstructed): environment enumeration, processes/IPC, Linux permissions, path/wildcard abuse, bash tricks, cron & systemd timers, sudo (sudoedit, LD_PRELOAD, NOPASSWD, CVE-2019-14287, Baron Samedit), SUID/SGID (GTFOBins), capabilities, privileged groups (disk/video/lxd/docker/adm), vulnerable services, kernel exploits (DirtyCow, DirtyPipe), shared library / .so hijacking, python library hijacking, tar/chown wildcard injection, NFS no_root_squash, logrotate/motd/pam, Docker, LXC/LXD, brief Kubernetes mention, hardening/detection, skills assessment (two chained boxes).
- Hand-holding: medium. Theory + Pwnbox demo + one flag-string question per section. The end-of-module skills assessment is notoriously a difficulty cliff.

### 1.2 HTB machines frequently cited as best privesc teachers
- Lame (Linux, Easy) — distcc/Samba lands as root; enumeration lesson.
- Shocker (Linux, Easy) — Shellshock + perl NOPASSWD sudo (GTFOBin).
- Traverxec (Linux, Easy) — nostromo RCE → .htpasswd crack → journalctl/less SUID.
- TartarSauce (Linux, Medium) — `tar --checkpoint-action` twice (sudo tar + cron tar race), classic realistic misconfig.
- Academy (Linux, Easy) — Laravel RCE → composer sudo GTFOBin.
- Also commonly cited: OpenAdmin, Admirer, Irked, Bashed.

### 1.3 Starting Point
- Tier 0: network basics, no privesc.
- Tier 1: foothold-focused, one trivial sudo escalation.
- Tier 2: two-flag boxes, GTFOBins (find, vim), NOPASSWD sudo, writable cron, basic SUID.
- Tier 3: first "real" privesc — `Included` = lxd group → root (Alpine image mount container escape); `Markup` = XXE + SSH key abuse; `Base` = sudo find. Tier 3 is VIP-gated in practice.

## 2. TryHackMe

### 2.1 Linux PrivEsc (tryhackme.com/room/linuxprivesc)
- Author Sagi Shahar, maintained by Tib3rius (companion to his Udemy OSCP course).
- ~22 tasks. Free. Very hand-held ("run this, paste the output").
- Techniques: enumeration (LinEnum/linpeas), kernel exploits (DirtyCow), stored passwords, weak file perms (/etc/shadow writable), SSH key hunting, sudo shell escapes + LD_PRELOAD + CVE-2019-14287, SUID + shared object injection, SUID env var / PATH hijack, writable /etc/passwd, NFS no_root_squash, cron wildcards + writable cron scripts, capabilities, final unaided challenge.
- Container content: zero. No Docker, no LXC, no K8s.

### 2.2 Linux PrivEsc Arena
- Companion drill room, same VM family. Free intro, many tasks Premium-gated. Pure repetition across ~9 vectors on one box. Still zero container content.

### 2.3 Container escape rooms on THM
- The Docker Rodeo — core teaching room: exposed docker.sock, `--privileged`, SYS_ADMIN cap, `/` mount, `nsenter`, shared PID ns. Premium only.
- The Great Escape — free CTF, user.txt in container, root.txt on host, classic docker.sock escape.
- Dodge This — free container-themed CTF, light teaching.
- AoC 2025 Day 14 "DoorDasher's Demise" — docker.sock escape + pivot to privileged deployer container; free during event.
- Intro to Containerisation / Intro to Docker — defensive/building, not escape.
- No dedicated Kubernetes escape room. No coverage of Nov-2025 runc CVEs (31133/52565/52881) on either platform.

### 2.4 2024–2026 THM privesc cadence
- No major new flagship Linux privesc room in 2025; the Tib3rius room from 2019 is still canonical. THM's 2025 energy went to AI security, AWS/cloud, and SOC content.

## 3. Head-to-head

| Dimension | HTB Academy | HTB retired machines | THM Linux PrivEsc | THM Arena | THM Docker Rodeo |
|---|---|---|---|---|---|
| Format | Theory + Pwnbox + flag Q | Black-box realistic | Guided answer-box | Open drill | Guided container escape |
| Hand-holding | Medium | None | High | Medium | Medium |
| Theory depth | Deep | None | Shallow | None | Shallow |
| Container coverage | Docker + LXD (2 sections, ~6–8%) | Occasional (`Included`, `Sandworm`) | None | None | Core focus |
| Kubernetes | Brief mention | A few boxes | None | None | None |
| 2025 runc CVEs | No | No | No | No | No |
| Price floor | $8/mo student / ~490 cubes / Silver | VIP+ ~$20/mo | Free | Partly free | Premium ~$14/mo |

## 4. Key questions answered

1. **Model fit for privesc.** THM rooms are better for initial pattern recognition; HTB machines are better for chaining. The right answer for Phantom is a hybrid: topic lesson that terminates in an unguided chained box.
2. **Hand-holding gradient.** THM Linux PrivEsc < THM Arena < HTB Academy skills assessment < HTB retired machines < OSCP.
3. **Container/cloud share.** HTB Academy ≈6–8% container (Docker + LXD, ~2019–2021 era). THM's free flagship = 0%. Neither covers the Nov-2025 runc CVE cluster. Kubernetes privesc is essentially absent from both.
4. **Min price to reach container-escape content.** HTB Academy: $8/mo student or ~$20 one-off Cubes. HTB retired `Included`: VIP+ ~$20/mo. THM Docker Rodeo: Premium ~$9–14/mo. Free floor is patchy — only `The Great Escape` teaches a single vector.
5. **Common sentiment.**
   - Hated on HTB: Cubes depletion / "rug-pull pricing", skills-assessment difficulty cliff, Oct-2025 VIP tier removal, aging retired boxes.
   - Hated on THM: over-guided ("I finished 200 rooms and still can't root an HTB easy box"), content aging, no modern container/K8s.
   - Loved on HTB: realism, writeup ecosystem, CPTS path reputation.
   - Loved on THM: free onboarding, theory embedded in tasks, beginner on-ramp.

## 5. Gap analysis for Phantom

**Steal from HTB:** in-browser attacker VM (Pwnbox), end-of-module chained skills assessment, job-role paths (privesc lives inside a pentest narrative, not alone), writeup-friendly machine design.

**Steal from THM:** free onboarding, guided answer tasks for first exposure then remove scaffolding, theory paragraphs inside the room (not a separate Academy product), one canonical room per topic.

**Gaps Phantom can own:**
1. **2026-reality container escape.** Neither platform teaches Nov-2025 runc CVEs, containerd vs runc vs crun, rootless Docker, gVisor, or Kubernetes escape (kubelet, node privesc, PSA bypass, service-account token theft). Biggest gap by far.
2. **Free path all the way through container escape.** HTB gates it behind subs; THM's deep container room is Premium.
3. **Opinionated narrative.** Nobody does "8-chapter story: low-priv web user → container escape → cluster pivot → cloud metadata exfil." HTB is random boxes, THM is topic trees.
4. **Modernity cadence.** HTB Academy updates on year-scale. Ship labs within weeks of CVE disclosure; runc-2025 was a free PR moment no one captured.

**Would a learner cancel HTB Academy for a $0 Phantom?** No, not on price alone. What keeps them on HTB is CPTS credibility and hiring-manager recognition. To pull them across Phantom needs (a) content HTB doesn't have (modern container/K8s), (b) narrative gameplay, (c) visible outcomes (leaderboard, writeups, hiring channel), and eventually (d) a recognized cert/badge. Free is the click; quality and modernity decide the cancel.

## 6. Three concrete things Phantom should do differently

1. **Flagship track = "2026 Container Escape", not a side module.** 6–8 labs: docker.sock, privileged flag, SYS_ADMIN/DAC_READ_SEARCH caps, mount-ns escapes, the Nov-2025 runc CVE chain (CVE-2025-31133 / 52565 / 52881), kubelet + service-account theft, and a final unguided "pod → cluster admin" chained scenario. No one has this end-to-end in 2026.
2. **Invert the hand-holding curve inside a single topic.** Lab 1 THM-style guided answers, lab 2 HTB-Academy-style (theory + one target, fewer prompts), lab 3 HTB-machine-style (black box, IP, go). Scaffolding removed in one afternoon — HTB and THM's product shapes prevent them doing this.
3. **Narrative wargame, not a topic tree.** One operation called "Phantom": land on a compromised web pod, escalate, escape, pivot, persist. Each lab is a chapter. Keep everything free through the container-escape chapter; monetize only the optional cloud/AD/persistence chapters and team features.

---

## Summary

HTB Academy's Linux PrivEsc module is the broadest paid product (≈33 sections, tier-II, $8/mo student floor after the Oct-2025 VIP-tier removal) and THM's free Tib3rius room is the canonical beginner on-ramp (~22 guided tasks, zero container content); between them neither covers the Nov-2025 runc CVE cluster, Kubernetes escape, or modern runtimes like containerd/crun/gVisor. HTB's fatal flaws are the Cubes rug-pull, the end-of-module difficulty cliff, and aging retired boxes; THM's fatal flaws are over-guidance ("answer-box fatigue") and 2019-era content that stops at classic SUID/sudo/cron. The clearest product gap is a free, narrative-driven track that teaches 2026 container and Kubernetes escape end-to-end with runtime-level CVE labs updated on a weeks-scale cadence. Phantom should invert the hand-holding curve inside each topic (guided → assisted → black-box in one sitting), something neither incumbent's product shape allows, and wrap the entire track in a single mission narrative instead of a topic tree. Price alone will not pull learners off HTB Academy — CPTS credibility is the lock-in — so Phantom must win on content modernity, narrative, and visible outcomes, with "free through container escape" as table stakes rather than the differentiator.
