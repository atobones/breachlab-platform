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
  3: { tier: "act1", goal: "Hijack shared library loading via LD_PRELOAD.", realWorldSkill: "Environment variable abuse crosses the boundary between convenience and capability.", mitigationVersion: "2026-04" },
  4: { tier: "act1", goal: "Exploit Linux capabilities on an interpreter binary.", realWorldSkill: "Capabilities replace SUID but are rarely audited — one misplaced cap = full root.", mitigationVersion: "2026-04" },
  5: { tier: "act1", goal: "Leverage dangerous group membership for privilege escalation.", realWorldSkill: "Certain Linux groups are root by design.", mitigationVersion: "2026-04" },
  6: { tier: "act1", goal: "Hijack a world-writable cron script running as root.", realWorldSkill: "Scheduled tasks with bad permissions are the #1 persistence vector on Linux.", mitigationVersion: "2026-04" },
  7: { tier: "act1", goal: "Exploit command injection in a SUID binary.", realWorldSkill: "Custom SUID binaries with unsanitized input are everywhere in enterprise environments.", mitigationVersion: "2026-04" },
  8: { tier: "act1", goal: "Inject code into a running root process via ptrace.", realWorldSkill: "Live process injection is the foundation of every memory-resident implant.", mitigationVersion: "2026-04" },
  9: { tier: "act1", goal: "Exploit a buffer overflow in a SUID binary.", realWorldSkill: "Memory corruption is the gateway to exploit development.", mitigationVersion: "2026-04" },

  // ACT II: HARVEST & PERSIST (10-15)
  10: { tier: "act2", goal: "Harvest credentials from history, config files, SSH keys, environment variables.", realWorldSkill: "Root on one machine is nothing — the real value is credentials to other systems.", mitigationVersion: "2026-04" },
  11: { tier: "act2", goal: "Find and decode tokens: JWT, AWS credentials, K8s service account tokens, git secrets.", realWorldSkill: "Modern systems authenticate with tokens, not passwords. Finding them is the new credential harvesting.", mitigationVersion: "2026-04" },
  12: { tier: "act2", goal: "Install 4 persistence mechanisms that survive a reboot.", realWorldSkill: "Maintaining access is the difference between a scan and an operation.", mitigationVersion: "2026-04" },
  13: { tier: "act2", goal: "Install advanced persistence: LD_PRELOAD, PAM backdoor, alias injection.", realWorldSkill: "Stealthy persistence that evades basic security audits.", mitigationVersion: "2026-04" },
  14: { tier: "act2", goal: "Read a flag without leaving traces in auditd logs.", realWorldSkill: "Operating under active monitoring is the reality of every modern network.", mitigationVersion: "2026-04" },
  15: { tier: "act2", goal: "Erase every forensic trace of your presence on this box.", realWorldSkill: "Clean exit is what separates a detected intrusion from a successful operation.", mitigationVersion: "2026-04" },

  // ACT III: LATERAL MOVEMENT (16-19)
  16: { tier: "act3", goal: "Use SSH tunneling to reach internal machines from the entry host.", realWorldSkill: "Pivoting is how you turn one shell into network-wide access.", mitigationVersion: "2026-04" },
  17: { tier: "act3", goal: "Scan and exploit services on the internal network.", realWorldSkill: "Internal services without authentication are the fastest path to lateral movement.", mitigationVersion: "2026-04" },
  18: { tier: "act3", goal: "Spray harvested credentials across internal hosts.", realWorldSkill: "Password reuse is the most reliable lateral movement technique in the real world.", mitigationVersion: "2026-04" },
  19: { tier: "act3", goal: "Full 3-machine pivot chain: entry → web → db → mgmt.", realWorldSkill: "Real engagements chain multiple hops. This is where everything comes together.", mitigationVersion: "2026-04" },

  // ACT IV: CONTAINER & CLOUD (20-26)
  20: { tier: "act4", goal: "Determine if you are in a container and identify the escape path.", realWorldSkill: "Container awareness is the first step of every modern post-exploitation.", mitigationVersion: "2026-04" },
  21: { tier: "act4", goal: "Escape through Docker socket, privileged flag, or cgroup v1.", realWorldSkill: "Three classic container escape techniques every operator must know.", mitigationVersion: "2026-04" },
  22: { tier: "act4", goal: "Exploit CVE-2024-21626 Leaky Vessels — runc file descriptor leak.", realWorldSkill: "The 2024 headline CVE that affected 80% of cloud environments.", mitigationVersion: "2024-01" },
  23: { tier: "act4", goal: "Exploit an exposed Docker API on port 2375.", realWorldSkill: "Unauthenticated Docker APIs are still found in real infrastructure.", mitigationVersion: "2026-04" },
  24: { tier: "act4", goal: "Escape a Kubernetes pod via hostPID/hostNetwork misconfiguration.", realWorldSkill: "K8s pod misconfigurations are the entry point to cluster compromise.", mitigationVersion: "2026-04" },
  25: { tier: "act4", goal: "Takeover a K8s cluster using service account token and curl.", realWorldSkill: "Kubectl-free cluster exploitation — the skill that defines a modern operator.", mitigationVersion: "2026-04" },
  26: { tier: "act4", goal: "Harvest cloud credentials from the IMDS metadata service.", realWorldSkill: "Every major cloud breach starts with IMDS. This is where Phantom ends and cloud begins.", mitigationVersion: "2026-04" },

  // ACT V: OPERATIONS (27-31)
  27: { tier: "act5", goal: "Write custom tools: reverse shell, privesc automation, exploit adaptation.", realWorldSkill: "Real operators write their own tools, not run someone else's scripts.", mitigationVersion: "2026-04" },
  28: { tier: "act5", goal: "Exfiltrate data through DNS tunneling or HTTPS.", realWorldSkill: "The objective of every operation is data, not root.", mitigationVersion: "2026-04" },
  29: { tier: "act5", goal: "Intercept plaintext credentials from network traffic.", realWorldSkill: "Passive credential capture from the wire — the quietest technique.", mitigationVersion: "2026-04" },
  30: { tier: "act5", goal: "Erase all traces across 4 machines in the network.", realWorldSkill: "Multi-host cleanup is the final discipline of a complete operator.", mitigationVersion: "2026-04" },
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
