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
  3: { tier: "act1", goal: "Hijack a sudo command via LD_PRELOAD (env_keep sudoers rule + custom shared library).", realWorldSkill: "LD_PRELOAD is the canonical env-variable abuse. RPATH and PATH injection are siblings you will meet later in Venom and Flux.", mitigationVersion: "2026-04" },
  4: { tier: "act1", goal: "Exploit a cap_setuid capability on a Python interpreter binary.", realWorldSkill: "Capabilities replace SUID but are rarely audited. One misplaced cap_setuid on an interpreter = full root.", mitigationVersion: "2026-04" },
  5: { tier: "act1", goal: "Exploit membership in the shadow group — read /etc/shadow and crack root's hash.", realWorldSkill: "Some Linux groups are root-equivalent by design. shadow is the loudest one.", mitigationVersion: "2026-04" },
  6: { tier: "act1", goal: "Hijack a group-writable cron script running as root every minute.", realWorldSkill: "Scheduled tasks with loose permissions are a top-3 privilege-escalation vector on Linux. Systemd-timer and NFS variants are covered in Wraith / Sentinel.", mitigationVersion: "2026-04" },
  7: { tier: "act1", goal: "Exploit command injection in a SUID binary.", realWorldSkill: "Custom SUID binaries with unsanitized input are everywhere in enterprise environments.", mitigationVersion: "2026-04" },
  8: { tier: "act1", goal: "Inject code into a running root process via ptrace.", realWorldSkill: "Live process injection is the foundation of every memory-resident implant.", mitigationVersion: "2026-04" },
  9: { tier: "act1", goal: "Exploit a stack buffer overflow in a SUID binary (no NX, no stack canary, no PIE).", realWorldSkill: "Memory corruption is the gateway to exploit development. Full kernel-CVE exploitation lives in the Flux track.", mitigationVersion: "2026-04" },

  // ACT II: HARVEST & PERSIST (10-15)
  10: { tier: "act2", goal: "Harvest credentials from history, config files, SSH keys, environment variables.", realWorldSkill: "Root on one machine is nothing — the real value is credentials to other systems.", mitigationVersion: "2026-04" },
  11: { tier: "act2", goal: "Find and decode tokens: JWT, AWS credentials, K8s service account tokens, git secrets.", realWorldSkill: "Modern systems authenticate with tokens, not passwords. Finding them is the new credential harvesting.", mitigationVersion: "2026-04" },
  12: { tier: "act2", goal: "Install 4 persistence mechanisms that survive a reboot.", realWorldSkill: "Maintaining access is the difference between a scan and an operation.", mitigationVersion: "2026-04" },
  13: { tier: "act2", goal: "Install advanced persistence: LD_PRELOAD, PAM backdoor, alias injection.", realWorldSkill: "Stealthy persistence that evades basic security audits.", mitigationVersion: "2026-04" },
  14: { tier: "act2", goal: "Read a flag without leaving traces in auditd logs.", realWorldSkill: "Operating under active monitoring is the reality of every modern network.", mitigationVersion: "2026-04" },
  15: { tier: "act2", goal: "Erase every forensic trace of your presence on this box.", realWorldSkill: "Clean exit is what separates a detected intrusion from a successful operation.", mitigationVersion: "2026-04" },

  // ACT III: LATERAL MOVEMENT (16-19)
  16: { tier: "act3", goal: "Set up an SSH -L local port forward through ops@mgmt using the ed25519 key on ~/.ssh/id_ed25519_ops. The flag HTTP service on mgmt is bound to 127.0.0.1:8080 only — no tunnel, no flag.", realWorldSkill: "Pivoting turns one shell into network-wide access. Localhost-bound services behind a bastion are the exact pattern every real engagement hits.", mitigationVersion: "2026-04" },
  17: { tier: "act3", goal: "Scan and exploit services on the internal network.", realWorldSkill: "Internal services without authentication are the fastest path to lateral movement.", mitigationVersion: "2026-04" },
  18: { tier: "act3", goal: "Spray harvested credentials across internal hosts.", realWorldSkill: "Password reuse is the most reliable lateral movement technique in the real world.", mitigationVersion: "2026-04" },
  19: { tier: "act3", goal: "Walk the full pivot chain entry → web → db → mgmt. Credentials for each hop are breadcrumb'd on the previous host (bash_history + config files). Final flag is on mgmt /root/tunnel_flag via ops + sudo.", realWorldSkill: "Real engagements chain multiple hops. Operators trace the credential trail, they do not brute-force it.", mitigationVersion: "2026-04" },

  // ACT IV: CONTAINER & CLOUD (20-26)
  20: { tier: "act4", goal: "Run the canonical container-detection checklist and have your work verified against /opt/verify-container.sh.", realWorldSkill: "Container awareness is the first step of every modern post-exploitation. Know all six detection categories cold.", mitigationVersion: "2026-04" },
  21: { tier: "act4", goal: "Escape to the simulated host via a mounted Docker Unix socket using curl — create a container that bind-mounts / and reads the host flag.", realWorldSkill: "A mounted docker.sock is a classic misconfiguration and one of the fastest escapes in modern cloud-native stacks.", mitigationVersion: "2026-04" },
  22: { tier: "act4", goal: "Exploit CVE-2024-21626 pattern — use the leaked fd at /proc/self/fd/3 to read a host file that is unreadable by the literal path.", realWorldSkill: "Leaky Vessels was the 2024 headline CVE — ~80% of cloud environments were affected. The fd-leak pattern recurs across container runtimes.", mitigationVersion: "2024-01" },
  23: { tier: "act4", goal: "Attack the unauthenticated Docker API on TCP :2375 — POST a container-create payload that bind-mounts the host and reads the flag from the returned logs.", realWorldSkill: "Unauthenticated :2375 still turns up on cloud perimeters and internal networks. Engine-API fluency is the required skill.", mitigationVersion: "2026-04" },
  24: { tier: "act4", goal: "Reach the secret THROUGH the host-init process's /proc view: cat /proc/<pid>/root/opt/host-ns/host_secret. The verifier audits bash_history for the /proc/<pid>/root pattern — direct cat of the file does not count.", realWorldSkill: "hostPID visibility + /proc/<pid>/root/ is the core of every pod-to-host escape in K8s. The technique is the whole lesson.", mitigationVersion: "2026-04" },
  25: { tier: "act4", goal: "Walk the full K8s API chain against 10.13.37.30:6443 — SA token → leaked cluster-admin token → read kube-system secret. No kubectl, just curl.", realWorldSkill: "Kubectl-free cluster exploitation. Every modern red-team engagement exercises this sequence.", mitigationVersion: "2026-04" },
  26: { tier: "act4", goal: "Harvest cloud credentials from the IMDS metadata service.", realWorldSkill: "Every major cloud breach starts with IMDS. This is where Phantom ends and cloud begins.", mitigationVersion: "2026-04" },

  // ACT V: OPERATIONS (27-31)
  27: { tier: "act5", goal: "Write custom tools: reverse shell, privesc automation, exploit adaptation.", realWorldSkill: "Real operators write their own tools, not run someone else's scripts.", mitigationVersion: "2026-04" },
  28: { tier: "act5", goal: "Exfiltrate /opt/vault/classified.db through DNS (port 53) or HTTPS (port 443). iptables is enforcing a REJECT-by-default OUTPUT policy with only DNS + 443 allowed, so anything else is silently dropped.", realWorldSkill: "The objective of every operation is data, not root. Real egress controls force quiet, protocol-shaped exfiltration.", mitigationVersion: "2026-04" },
  29: { tier: "act5", goal: "Intercept plaintext credentials from network traffic.", realWorldSkill: "Passive credential capture from the wire — the quietest technique.", mitigationVersion: "2026-04" },
  30: { tier: "act5", goal: "Erase every trace of phantom16-30 from auth.log, wtmp, btmp, bash_history, audit.log, lastlog, and /tmp. /opt/verify-clean-exit.sh checks all categories.", realWorldSkill: "Clean exit is the final discipline of a complete operator — if the forensics sweep finds anything, the operation is burned.", mitigationVersion: "2026-04" },
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
