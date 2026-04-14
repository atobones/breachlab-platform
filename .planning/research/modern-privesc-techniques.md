# Modern Linux Privesc + Container Escape — Phantom Track Research

## Part 1: Classic Linux Privesc — What's Still Relevant

### 1.1 GTFOBins landscape

- **~390 binaries total** on the site.
- **~190** marked `suid`-exploitable.
- **~230** marked `sudo`-exploitable (heavy overlap with SUID).
- **~25** via Linux `capabilities`.

**Function categories** (GTFOBins' "Functions" facet):

| Function | Meaning | Rough count |
|---|---|---|
| `shell` | Spawns an interactive shell | ~140 |
| `command` | Runs arbitrary OS commands | ~130 |
| `file-read` | Reads files the caller can't | ~90 |
| `file-write` | Writes/overwrites arbitrary files | ~80 |
| `file-download` | Pulls remote files | ~40 |
| `file-upload` | Exfiltrates files | ~30 |
| `library-load` | Loads attacker-controlled `.so` | ~15 |
| `limited-suid` | Escalation needs extra conditions | ~50 |
| `reverse-shell` / `bind-shell` / `non-interactive-reverse-shell` | Network callback primitives | combined ~60 |

**Recent (2024) additions trend:** GTFOBins moves slowly. Recent PRs add modern CI/CD and container tooling (`buildah`, `crictl`, `podman`, newer systemd helpers). The 2024 pattern is **container/CI binaries showing up in sudo allowlists**, not new POSIX tricks.

### 1.2 Top 15 real-world SUID/sudo binaries

Ranked by how often they actually appear in HTB/THM/OSCP write-ups and real incidents:

1. `find` — `-exec /bin/sh \;`, the SUID classic
2. `vim` / `vi` / `rvim` — `:!sh`
3. `nano` / `pico` — `^R ^X` command exec
4. `bash` / `sh` / `dash` — `-p` preserves EUID
5. `less` / `more` / `man` — `!sh` pager escape
6. `awk` / `gawk` / `nawk` — `BEGIN {system("/bin/sh")}`
7. `perl` — `exec "/bin/sh";`
8. `python` / `python3` — `os.execl("/bin/sh","sh","-p")`
9. `tar` — `--checkpoint-action=exec=...`
10. `cp` / `mv` — overwrite `/etc/passwd`, `sudoers.d/`, `shadow`
11. `systemctl` — install a malicious unit file
12. `env` — `env /bin/sh -p`
13. `nmap` — legacy `--interactive`, or `--script` on newer
14. `cat` / `base64` / `xxd` — file-read primitives for `/etc/shadow`, `id_rsa`
15. `docker` / `lxc` / `podman` — group member or sudo → full host

### 1.3 Sudo misconfigurations

- **`NOPASSWD` on a GTFOBins binary** — canonical chain.
- **`env_keep += LD_PRELOAD`** — `LD_PRELOAD=/tmp/evil.so sudo <allowed cmd>`; `.so` constructor runs as root. Cleanest env-var abuse demo.
- **`env_keep += LD_LIBRARY_PATH`** — replace a legit library under attacker-writable path.
- **`SETENV:` tag** — user can inject arbitrary env vars even without `env_keep`.
- **Wildcard in argument** (`sudo /usr/bin/tar cf /backup/*`) — drop files named like `--checkpoint-action=exec=sh` into cwd.
- **`!requiretty`** on a no-password rule calling a shell script.
- **CVE-2023-22809 (sudoedit)** — `EDITOR=/bin/vi -- /etc/shadow` escapes the allowed-files list.
- **CVE-2025-32463** — sudo's `-h/--host` option could enable local privesc in some sudoers rules.
- **Baron Samedit (CVE-2021-3156)** — heap overflow in sudo.

### 1.4 PATH hijacking vectors

- Relative path in a cron/SUID script (script calls `backup`, not `/usr/bin/backup`).
- `PATH=.:$PATH` in `/etc/environment` (rare but lethal).
- Writable cron script, or writable directory containing a cron script.
- Wildcard injection inside a cron tar/chown job.

### 1.5 Writable critical files

- World-writable `/etc/passwd` → add a root user with `openssl passwd`.
- Readable/writable `/etc/shadow` → hashcat or direct overwrite.
- Writable `/etc/sudoers.d/*` → drop `user ALL=(ALL) NOPASSWD:ALL`.
- Writable `/etc/cron.d/`, `/etc/cron.hourly/` → root cron injection.
- Writable `/etc/ld.so.conf.d/` → persistent library hijack.
- Writable systemd unit files → `systemctl daemon-reload`.

### 1.6 Linux capabilities — concrete paths

- **`cap_setuid+ep`** on `python`/`perl`/`node`: `python -c 'import os; os.setuid(0); os.system("/bin/sh")'`.
- **`cap_dac_read_search+ep`**: bypass all read checks. Dump `/etc/shadow`, `/root/.ssh/id_rsa`, kubeconfigs. Read-only.
- **`cap_dac_override+ep`**: bypass read AND write → overwrite `/etc/passwd`.
- **`cap_sys_ptrace+ep`**: attach to a root process, inject shellcode.
- **`cap_sys_admin+ep`**: near-root. Mount arbitrary filesystems — workhorse for container escapes.
- **`cap_sys_module+ep`**: `insmod` a kernel module → game over.
- **`cap_chown+ep`**: chown `/etc/shadow` to self.

### 1.7 Recent kernel CVEs (name-drop level only)

- **DirtyPipe (CVE-2022-0847)** — overwrite RO files via pipe page cache.
- **DirtyCred (Zhenpeng Lin, 2022)** — credential-swap methodology.
- **StackRot (CVE-2023-3269)** — maple-tree UAF.
- **nf_tables "Flipping Pages" (CVE-2024-1086)** — UAF in netfilter; **used in 2025 by RansomHub and Akira ransomware**. Needs unprivileged user namespaces + nf_tables. **The headline 2024 kernel privesc.**
- **io_uring family** — CVE-2023-2598, CVE-2024-0582, CVE-2024-27316 etc.

> Phantom should **name** these, give one-paragraph mechanism, and **not** ship kernel labs. Kernel exploitation belongs in a dedicated advanced track.

---

## Part 2: Container Escape — The 2024-2026 Reality

### 2.1 Docker-specific escapes

**A. Mounted `/var/run/docker.sock`** — container talks to host Docker daemon via REST API, spawns a sibling with `--privileged -v /:/host` and chroots. **#1 real-world container escape in pentests.** Zero CVE required.

**B. `--privileged` flag** — all caps dropped, seccomp/AppArmor off, `/dev` exposed. `fdisk -l` → `mount /dev/sda1 /mnt/host` → write SSH key / cron / sudoers.

**C. Privileged + CAP_SYS_ADMIN + cgroup v1 `release_agent` (2022 famous)** — mount an RDMA cgroup inside container, write host-path payload into `release_agent`, enable `notify_on_release`, exit last task → kernel executes payload as full host root. **cgroup v2 removed `release_agent` entirely.** Teach as legacy mechanism.

**D. Mounted `/proc` or `/proc/1/root`** — PID 1 on the host is init; `/proc/1/root/` is the host FS. Also applies to `hostPID:true` in K8s.

**E. Leaky default-container capabilities** — Docker default set still includes `NET_RAW`, `SETUID`, `SETGID`, `CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `MKNOD`, `SYS_CHROOT`, `KILL`, `AUDIT_WRITE`, `NET_BIND_SERVICE`, `SETFCAP`, `SETPCAP`.

**F. CVE-2019-5736 (runc `/proc/self/exe` overwrite)** — container overwrites runc when a `docker exec` lands in it; next exec runs attacker code as host root. **Still taught in every container-security course** because the pattern (cross-boundary binary replacement) is pedagogical gold.

**G. CVE-2024-21626 "Leaky Vessels" (runc)** — **the 2024 headline.** runc leaks an internal fd (often fd 7/9) pointing at a host directory before `pivot_root`. Set `process.cwd` to `/proc/self/fd/<leaked>` via Dockerfile `WORKDIR` or malicious OCI config → the container's initial process starts with cwd on the host FS → `cd ../../../ && chroot . sh`. Affects runc ≤ 1.1.11, patched 1.1.12. Sibling bugs in BuildKit: CVE-2024-23651/52/53. Conceptually distinct from cap/namespace abuse — it's **file-descriptor leakage** as a boundary failure.

### 2.2 Kubernetes-specific escapes

**A. Privileged pod + hostPath + hostPID combo (Bishop Fox "Bad Pods")** — `privileged:true`, `hostPID:true`, `hostPath:/` at `/host` → `nsenter --target 1 --mount --uts --ipc --net --pid -- bash` lands in host's PID 1 namespace. The canonical K8s one-liner escape.

**B. ServiceAccount token abuse (kubectl-free)** — every pod has `/var/run/secrets/kubernetes.io/serviceaccount/token` unless explicitly disabled. `curl -H "Authorization: Bearer $(cat /var/run/.../token)" https://kubernetes.default.svc/...`. Dangerous SA verbs:
- `create pods` / `create pods/exec` → spawn privileged pod mounting `/`.
- `get secrets` → exfiltrate cluster-admin tokens.
- `patch nodes` → taint/cordon.
- `impersonate` → assume `system:masters`.

This is the **signature Phantom move** — almost no commercial course teaches the raw-API version.

**C. hostPath volume escape (no `privileged:true` needed)** — mount `/var/lib/kubelet` or `/etc/kubernetes/manifests`; drop a static pod manifest → kubelet runs it cluster-wide with host access.

**D. hostPID / hostIPC / hostNetwork**
- `hostPID` → `ps` all host processes, ptrace, `/proc/<root-pid>/environ` secrets.
- `hostNetwork` → sniff, bind host interfaces, reach kubelet :10250, etcd :2379.
- `hostIPC` → host SHM access; often overlooked.

**E. Kubelet read/write API (:10250)** — if reachable unauth (older/self-managed): `curl -k https://<node>:10250/pods`, then POST `/run/<ns>/<pod>/<container>` to exec.

**F. etcd direct read** — `/var/lib/etcd/member/snap/db` contains every Secret, SA token, kubeconfig, TLS cert in the cluster.

**G. Tiller (Helm v2, dead since 2020)** — legacy clusters: unauth gRPC :44134 with cluster-admin.

### 2.3 Container runtime CVEs worth teaching

- **CVE-2019-5736 (runc)** — pattern template.
- **CVE-2024-21626 (runc Leaky Vessels)** — must-know modern escape.
- **CVE-2024-23651/52/53 (BuildKit)** — same disclosure wave; exploitable during image build via malicious Dockerfiles. CI/CD threat model.
- **CVE-2022-0811 (CRI-O `cr8escape`)** — kernel param injection via `kernel.core_pattern`; hits OpenShift.
- **containerd CVE-2022-23648** — path traversal via image config.

### 2.4 User namespace / rootless — 2024-2026 bleeding edge

- Rootless Docker/Podman mitigate most misconfig escapes but **not** kernel-CVE exploitation or bad mounts.
- **Unprivileged user namespaces** remain the attack surface for kernel LPEs (CVE-2024-1086 requires them).
- **Ubuntu 23.10+** restricts unprivileged userns by default via AppArmor `userns_restrict` — teach as **defense**.

---

## Part 3: Cloud Layer — Where Phantom Ends and Mirage Begins

- **AWS IMDSv1 SSRF from container** → `http://169.254.169.254/latest/meta-data/iam/security-credentials/<role>` → temp creds → `aws sts assume-role` / `iam:PassRole` chains.
- **GCP metadata** at `metadata.google.internal` with `Metadata-Flavor: Google` → access tokens, kubeconfigs, SSH keys.
- **Azure IMDS** at `169.254.169.254/metadata/identity/oauth2/token` → managed identity tokens.

**Phantom boundary:** Phantom *mentions* IMDS as the exit door from a compromised container; cloud IAM exploitation belongs to **Mirage**. Phantom's final lab should end at "you now hold an AWS access key from the node's IMDS — go to Mirage."

---

## Part 4: Ranked Phantom Content Menu

### P0 — Must Include (13 techniques → the Phantom level list)

| # | Technique | F | T | R | O | Notes |
|---|---|---|---|---|---|---|
| 1 | SUID/sudo chained recon → GTFOBins exploit | 5 | 5 | 5 | 2 | Gateway lesson; teach the *method* (`getcap`, `sudo -l`, `find / -perm -4000`). |
| 2 | Sudo + LD_PRELOAD via `env_keep` | 4 | 5 | 5 | 3 | Cleanest env-var abuse demo. |
| 3 | Sudo wildcard arg injection (tar/chown/rsync) | 4 | 5 | 5 | 3 | "Why wildcards are dangerous," with a live payload. |
| 4 | Writable `/etc/passwd` / `sudoers.d` / `cron.d` | 4 | 4 | 5 | 2 | Fast, reliable; filesystem hygiene lesson. |
| 5 | Linux capabilities (`cap_setuid`, `cap_dac_read_search`, `cap_sys_ptrace`) | 4 | 5 | 5 | 3 | Most students never saw `getcap -r /`. High "aha". |
| 6 | PATH hijack via cron or SUID script | 4 | 4 | 5 | 3 | Underappreciated classic. |
| 7 | Mounted `/var/run/docker.sock` → spawn privileged sibling | 5 | 5 | 5 | 3 | #1 real-world container escape. Non-negotiable. |
| 8 | `--privileged` container → mount host block device | 5 | 5 | 5 | 3 | Pairs with #7 as "privileged is a lie." |
| 9 | **CVE-2024-21626 runc Leaky Vessels** | 4 | 5 | 5 | 5 | The 2026 headline. Conceptually unique (fd leak). |
| 10 | K8s privileged pod + hostPath + hostPID + nsenter | 5 | 5 | 5 | 4 | Bishop Fox "Bad Pods." Every modern pentester must know it. |
| 11 | **K8s ServiceAccount token → curl API → spawn privileged pod** | 5 | 5 | 5 | 5 | Kubectl-free escalation. Phantom's signature differentiator. |
| 12 | CVE-2019-5736 runc `/proc/self/exe` overwrite | 3 | 5 | 4 | 4 | The pattern teaches more than any modern CVE. |
| 13 | cgroup v1 `release_agent` escape | 3 | 5 | 3 | 3 | Flag as legacy, teach mechanism. |

### P1 — Should Include

- `docker` group membership = root (`docker run -v /:/h -it alpine chroot /h`).
- Kubelet :10250 unauth exec (legacy self-managed).
- **CVE-2024-1086 nf_tables** — theory lab with canned VM; don't ship the raw exploit.
- **CVE-2023-22809 sudoedit** — one-shot modern sudo CVE.
- **AWS IMDS → IAM credential exfil** — Phantom → Mirage handoff.
- etcd direct read from a hostPath-mounted pod.
- SSH key harvesting via `cap_dac_read_search`.

### P2 — Nice to Have

- DirtyPipe (CVE-2022-0847) — memorable, clean, dated kernel.
- BuildKit CVE-2024-23651/52/53 — CI/CD angle.
- CRI-O `cr8escape` — OpenShift niche.
- PwnKit (CVE-2021-4034) — unpatched 2020–2022 distros.
- Writable systemd unit/timer persistence.

### P3 — Out of Scope

- Kernel exploitation as a discipline → dedicated advanced "Kernel Wraith" track.
- Full cloud IAM escalation → **Mirage**.
- Supply-chain / malicious images → future "Prism" track.
- eBPF rootkits / detection evasion → future "Specter" track.
- Tiller — one-sentence mention, no lab.

---

## TL;DR for Phantom Scoping

1. Phantom's spine: sudo/caps → Docker escape → K8s pod escape → IMDS handoff to Mirage.
2. The 13 P0 techniques above are the Phantom level list. They cover ~90% of real-world 2026 Linux post-exploitation.
3. **CVE-2024-21626 (Leaky Vessels)** and **CVE-2024-1086 (nf_tables)** are the must-name modern CVEs — Leaky Vessels gets a hands-on lab, nf_tables gets a theory lesson.
4. Kernel exploitation stays out — ages too fast, needs its own track.
5. Cloud IAM stays out — it's Mirage.
6. The signature Phantom lab is **P0 #11**: kubectl-free ServiceAccount-token escalation via raw curl to the API server.

---

## Ranked P0 list (quick scan)

1. SUID/sudo chained recon → GTFOBins
2. Sudo + LD_PRELOAD via env_keep
3. Sudo wildcard argument injection
4. Writable /etc/passwd, sudoers.d, cron.d
5. Linux capabilities (setuid / dac_read_search / sys_ptrace)
6. PATH hijack via cron or SUID script
7. Mounted docker.sock → privileged sibling container
8. --privileged container → mount host block device
9. CVE-2024-21626 runc Leaky Vessels
10. K8s privileged pod + hostPath + hostPID + nsenter
11. K8s ServiceAccount token → curl API → privileged pod (signature lab)
12. CVE-2019-5736 runc /proc/self/exe overwrite
13. cgroup v1 release_agent escape (legacy, teach mechanism)
