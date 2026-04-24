export type PhantomTier = "act1" | "act2" | "act3" | "act4" | "act5";

export type PhantomLevelContent = {
  tier: PhantomTier;
  goal: string;
  commands?: string[];
  realWorldSkill: string;
  approach?: string;
  mitigationVersion: string;
  hidden?: boolean;
};

export const PHANTOM_LEVEL_CONTENT: Record<number, PhantomLevelContent> = {
  // ACT I: ESCALATION (0-9)
  0: { tier: "act1", goal: "Full situational awareness on a compromised host.", realWorldSkill: "Every engagement starts with enumeration.", mitigationVersion: "2026-04" },
  1: { tier: "act1", goal: "Find and exploit SUID binaries via GTFOBins.", realWorldSkill: "The #1 privilege escalation vector in the real world.", mitigationVersion: "2026-04" },
  2: { tier: "act1", goal: "Exploit permissive sudo rules to escalate privileges.", realWorldSkill: "Sudo misconfigurations are the most common finding in Linux audits.", mitigationVersion: "2026-04" },
  3: { tier: "act1", goal: "Hijack a sudo command by abusing a permissive environment-variable allow-list in sudoers.", realWorldSkill: "Environment-variable injection through sudo is the canonical loader-abuse pattern. RPATH and PATH siblings appear later in Venom and Flux.", mitigationVersion: "2026-04" },
  4: { tier: "act1", goal: "Find a Linux capability granted to a scripting-language interpreter and abuse it to become root.", realWorldSkill: "Capabilities replace SUID but are rarely audited. One misplaced privilege on an interpreter binary = full root.", mitigationVersion: "2026-04" },
  5: { tier: "act1", goal: "Exploit membership in the shadow group — read /etc/shadow and crack root's hash.", realWorldSkill: "Some Linux groups are root-equivalent by design. shadow is the loudest one.", mitigationVersion: "2026-04" },
  6: { tier: "act1", goal: "Hijack a group-writable cron script running as root every minute.", realWorldSkill: "Scheduled tasks with loose permissions are a top-3 privilege-escalation vector on Linux. Systemd-timer and NFS variants are covered in Wraith / Sentinel.", mitigationVersion: "2026-04" },
  7: { tier: "act1", goal: "Exploit command injection in a SUID binary.", realWorldSkill: "Custom SUID binaries with unsanitized input are everywhere in enterprise environments.", mitigationVersion: "2026-04" },
  8: { tier: "act1", goal: "Inject code into a running root process via ptrace.", realWorldSkill: "Live process injection is the foundation of every memory-resident implant.", mitigationVersion: "2026-04" },
  9: { tier: "act1", goal: "Exploit a stack buffer overflow in a SUID binary (no NX, no stack canary, no PIE).", realWorldSkill: "Memory corruption is the gateway to exploit development. Full kernel-CVE exploitation lives in the Flux track.", mitigationVersion: "2026-04" },

  // ACT II: HARVEST & PERSIST (10-15)
  10: { tier: "act2", goal: "Harvest credentials from history, config files, SSH keys, environment variables.", realWorldSkill: "Root on one machine is nothing — the real value is credentials to other systems.", mitigationVersion: "2026-04" },
  11: { tier: "act2", goal: "Find and decode tokens: JWT, AWS credentials, K8s service account tokens, git secrets.", realWorldSkill: "Modern systems authenticate with tokens, not passwords. Finding them is the new credential harvesting.", mitigationVersion: "2026-04" },
  12: { tier: "act2", goal: "Install 4 persistence mechanisms as an unprivileged user — the prior operator (phantom11) mis-chowned a set of target files; spot them and deploy.", realWorldSkill: "Persistence on a hardened box with no sudo is the real engagement — writable surfaces left behind by predecessors are the most common path.", mitigationVersion: "2026-04-24" },
  13: { tier: "act2", goal: "Install 3 stealthy persistence mechanisms from the fingerprint-scan canon (ld.so.preload, bash.bashrc, PAM auth stack, cron.d, systemd --user, profile.d). Runs on a fresh ephemeral container per session — port 2224.", realWorldSkill: "Stealth persistence at each architectural layer: loader, shell init, authentication, scheduler, service manager. Six canonical paths, you pick three.", mitigationVersion: "2026-04-24" },
  14: { tier: "act2", goal: "Copy /etc/shadow to /tmp/shadow_copy without the auditd LOUD-tool heuristic flagging a read of /root/shadow_flag. Fresh ephemeral per session — port 2225.", realWorldSkill: "Operating under auditd + a pre-seeded LOUD regex (cat/less/vi/cp/mv/dd/install/rsync/pv/split/hexdump and friends). Pick the one tool that is not in the signature.", mitigationVersion: "2026-04-24" },
  15: { tier: "act2", goal: "Erase every forensic trace of 5 prior operators on this box before /opt/verify-clean.sh scores you. Six cleanup categories: auth.log, audit.log, bash_history, wtmp, btmp, lastlog. Fresh ephemeral per session — port 2226.", realWorldSkill: "Cleanup on a box that has already seen production traffic. Selectively scrubbing *your* activity from mixed-operator logs is harder than wiping everything.", mitigationVersion: "2026-04-24" },

  // ACT III: LATERAL MOVEMENT (16-19)
  16: { tier: "act3", goal: "Set up an SSH -L local port forward through ops@mgmt using the ed25519 key on ~/.ssh/id_ed25519_ops. The flag HTTP service on mgmt is bound to 127.0.0.1:8080 only — no tunnel, no flag.", realWorldSkill: "Pivoting turns one shell into network-wide access. Localhost-bound services behind a bastion are the exact pattern every real engagement hits.", mitigationVersion: "2026-04" },
  17: { tier: "act3", goal: "Scan and exploit services on the internal network.", realWorldSkill: "Internal services without authentication are the fastest path to lateral movement.", mitigationVersion: "2026-04" },
  18: { tier: "act3", goal: "Spray harvested credentials across internal hosts.", realWorldSkill: "Password reuse is the most reliable lateral movement technique in the real world.", mitigationVersion: "2026-04" },
  19: { tier: "act3", goal: "Walk the full pivot chain entry → web → db → mgmt. Credentials for each hop are breadcrumb'd on the previous host (bash_history + config files). Final flag is on mgmt /root/tunnel_flag via ops + sudo.", realWorldSkill: "Real engagements chain multiple hops. Operators trace the credential trail, they do not brute-force it.", mitigationVersion: "2026-04" },

  // ACT IV: CONTAINER & CLOUD (20-26)
  20: { tier: "act4", goal: "Run the canonical container-detection checklist and have your work verified against /opt/verify-container.sh.", realWorldSkill: "Container awareness is the first step of every modern post-exploitation. Know all six detection categories cold.", mitigationVersion: "2026-04" },
  21: { tier: "act4", goal: "Escape to the simulated host via a mounted container-runtime Unix socket — create a workload that bind-mounts the host root and reads the flag.", realWorldSkill: "A mounted container-runtime socket is a classic misconfiguration and one of the fastest escapes in modern cloud-native stacks.", mitigationVersion: "2026-04" },
  22: { tier: "act4", goal: "Exploit a 2024 container-runtime fd-leak vulnerability — locate the leaked descriptor and use it to read a host file that is unreadable by literal path.", realWorldSkill: "This was the 2024 headline container CVE — ~80% of cloud environments were affected. The fd-leak pattern recurs across container runtimes.", mitigationVersion: "2024-01" },
  23: { tier: "act4", goal: "Attack the unauthenticated Docker API on TCP :2375 — POST a container-create payload that bind-mounts the host and reads the flag from the returned logs.", realWorldSkill: "Unauthenticated :2375 still turns up on cloud perimeters and internal networks. Engine-API fluency is the required skill.", mitigationVersion: "2026-04" },
  24: { tier: "act4", goal: "Reach the secret THROUGH the host-init process's /proc view: cat /proc/<pid>/root/opt/host-ns/host_secret. The verifier audits bash_history for the /proc/<pid>/root pattern — direct cat of the file does not count.", realWorldSkill: "hostPID visibility + /proc/<pid>/root/ is the core of every pod-to-host escape in K8s. The technique is the whole lesson.", mitigationVersion: "2026-04" },
  25: { tier: "act4", goal: "Walk the full K8s API chain against 10.13.37.30:6443 — SA token → leaked cluster-admin token → read kube-system secret. No kubectl, just curl.", realWorldSkill: "Kubectl-free cluster exploitation. Every modern red-team engagement exercises this sequence.", mitigationVersion: "2026-04" },
  26: { tier: "act4", goal: "Harvest cloud credentials from the IMDS metadata service.", realWorldSkill: "Every major cloud breach starts with IMDS. This is where Phantom ends and cloud begins.", mitigationVersion: "2026-04" },

  // ACT V: OPERATIONS (27-31)
  27: { tier: "act5", goal: "Write custom tools: reverse shell, privesc automation, exploit adaptation.", realWorldSkill: "Real operators write their own tools, not run someone else's scripts.", mitigationVersion: "2026-04" },
  28: { tier: "act5", goal: "Exfiltrate /opt/vault/classified.db through DNS (port 53) or HTTPS (port 443). iptables is enforcing a REJECT-by-default OUTPUT policy with only DNS + 443 allowed, so anything else is silently dropped.", realWorldSkill: "The objective of every operation is data, not root. Real egress controls force quiet, protocol-shaped exfiltration.", mitigationVersion: "2026-04" },
  29: { tier: "act5", goal: "Intercept plaintext credentials from network traffic.", realWorldSkill: "Passive credential capture from the wire — the quietest technique.", mitigationVersion: "2026-04" },
  30: { tier: "act5", goal: "Erase every trace of the full operation from auth.log, wtmp, btmp, bash_history, audit.log, lastlog, and /tmp. The box has real activity from 5 prior operators — scrub yours, leave theirs. /opt/verify-clean-exit.sh checks all categories. Fresh ephemeral per session — port 2227.", realWorldSkill: "The final discipline of a complete operator — if the forensics sweep finds anything, the operation is burned. Per-session ephemeral container: one connection, one fresh box, one clean-up attempt.", mitigationVersion: "2026-04-24" },
  31: {
    tier: "act5",
    hidden: true,
    goal: "Full operation: escalate → harvest → persist → lateral → container escape → cloud → exfiltrate → cleanup. 90 minutes. Detection score tracked.",
    realWorldSkill: "This is graduation. Everything you learned, in one mission.",
    mitigationVersion: "2026-04",
  },
};

export function getPhantomLevelContent(idx: number): PhantomLevelContent | null {
  return PHANTOM_LEVEL_CONTENT[idx] ?? null;
}
