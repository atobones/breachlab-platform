export type PhantomTier = "recruit" | "operator" | "phantom" | "graduate";

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
  // ──────────────────────────────────────────────────────────────
  // RECRUIT — Sudo domain mastery
  // ──────────────────────────────────────────────────────────────
  0: {
    tier: "recruit",
    goal:
      "This challenge is reconnaissance, not exploitation. You have an unprivileged shell on a hardened Linux host. To solve the challenge, read /flag. The flag will only be readable once you understand everything this machine will tell you about your own privileges.",
    commands: ["id", "groups", "sudo", "getcap", "find", "cat", "ls"],
    realWorldSkill:
      "Every real post-exploitation engagement starts with the same five minutes of enumeration. Operators who skip this step miss the one misconfiguration that would have ended the whole job.",
    mitigationVersion: "2026-04",
  },

  1: {
    tier: "recruit",
    goal:
      "This challenge contains a permissive sudo rule on a standard Linux utility. An unprivileged user can use the rule to execute arbitrary code as root. To solve the challenge, read /flag.",
    commands: ["sudo"],
    realWorldSkill:
      "Sudo allowlists containing binaries that were never meant to live in an allowlist are the number-one finding in real Linux hardening audits. Every defender must learn to read sudoers the way an attacker does.",
    mitigationVersion: "2026-04",
  },

  2: {
    tier: "recruit",
    goal:
      "This challenge contains a sudo rule that preserves a specific environment variable across privilege elevation. An unprivileged user can use it to execute attacker-controlled code as root. To solve the challenge, read /flag. You do not need to exploit the kernel.",
    commands: ["sudo", "gcc", "cc"],
    realWorldSkill:
      "The dynamic linker reacts to environment variables in ways most operators forget. This is one of the cleanest demonstrations of why environment variables are a capability, not a convenience.",
    mitigationVersion: "2026-04",
  },

  3: {
    tier: "recruit",
    goal:
      "This challenge contains a sudo rule whose command includes a filename pattern. A user who controls the contents of a nearby directory can force that pattern to interpret attacker-supplied files as command-line options. To solve the challenge, read /flag.",
    commands: ["sudo", "ls", "touch"],
    realWorldSkill:
      "Shell argument parsing rules are subtle enough that even experienced sysadmins ship sudo rules with glob expansion bugs. Every red team engagement finds at least one.",
    mitigationVersion: "2026-04",
  },

  4: {
    tier: "recruit",
    goal:
      "This challenge contains a sudo rule that allows the operator to edit a specific configuration file. A bug in the way the editor is invoked lets the operator open a file outside the allowed list. To solve the challenge, read /flag. You will need to look up a recent sudo security advisory.",
    commands: ["sudoedit", "sudo -l"],
    realWorldSkill:
      "Reading CVE advisories and adapting their fix description into an exploitation workflow is a daily task for every offensive security researcher. This challenge is practice at that specific skill.",
    mitigationVersion: "2026-04",
  },

  // ──────────────────────────────────────────────────────────────
  // OPERATOR — Capabilities + writable files + legacy docker
  // ──────────────────────────────────────────────────────────────
  5: {
    tier: "operator",
    goal:
      "This challenge contains a local authentication service that processes requests with a logic flaw. An unprivileged user can use the flaw to run code as root without any sudo rule at all. To solve the challenge, read /flag. You will need to look up a well-known 2022 local privilege escalation advisory.",
    commands: ["pkexec", "ls"],
    realWorldSkill:
      "Local authentication services sit on almost every Linux desktop and many servers. Bugs in their request handling become universal privilege escalation the moment they are disclosed — this one was unpatched on most distributions for over a decade.",
    approach:
      "The vulnerability is in a SUID binary belonging to a service that mediates privileged actions. It is not sudo. Read the service's man page to understand how it parses its arguments; the bug is triggered by abusing the difference between what the binary expects and what the standard C runtime gives it.",
    mitigationVersion: "2026-04",
  },

  6: {
    tier: "operator",
    goal:
      "This challenge contains a standard language interpreter with an unusual file attribute set on it. A user who understands that attribute can cause the interpreter to run with elevated privileges. To solve the challenge, read /flag.",
    commands: ["getcap", "python3", "perl", "node"],
    realWorldSkill:
      "Linux capabilities were introduced to replace the all-or-nothing SUID model with fine-grained privileges. In practice most administrators do not audit them, and a single misplaced attribute grants full root via a one-line script.",
    approach:
      "Look at every binary that has extra file attributes, not just the ones marked SUID. The specific attribute you are looking for directly grants the ability to change user identity. Ordinary GTFOBins tricks will not surface it — you need to enumerate with a different tool than find.",
    mitigationVersion: "2026-04",
  },

  7: {
    tier: "operator",
    goal:
      "This challenge contains a binary with a file attribute that lets it bypass standard read permission checks. An unprivileged user can use it to read files normally restricted to root. To solve the challenge, exfiltrate the contents of three files and concatenate them into the flag. The three files are /etc/shadow, /root/.ssh/id_rsa, and /root/.kube/config — the flag is hidden somewhere in the combined text.",
    commands: ["getcap"],
    realWorldSkill:
      "The ability to read arbitrary files is often worth more than a root shell. Real operators use this kind of capability for lateral movement — SSH key harvesting, kubeconfig theft, and credential exfiltration are all one attribute away from trivial.",
    approach:
      "The attribute you need is specifically the one that bypasses discretionary access control on reads. The binary granted it is almost certainly an ordinary file-display or archive tool. Once you find it, the bug is that it can read anything the filesystem exposes, so pick carefully what you read and where the flag might be embedded.",
    mitigationVersion: "2026-04",
  },

  8: {
    tier: "operator",
    goal:
      "This challenge contains a binary with a file attribute that lets it trace and modify other processes. An unprivileged user can use it to inject code into a privileged process that is already running. To solve the challenge, cause the running root-owned service to write /flag to disk. The service's PID is listed in /var/run/target.pid.",
    commands: ["getcap", "gdb"],
    realWorldSkill:
      "Live process injection is the fundamental primitive behind every memory-resident implant and every red-team persistence trick. Understanding how a debugger attaches to a running process is the doorway to every advanced post-exploitation technique.",
    approach:
      "The attribute lets you attach to processes you do not own. Ordinary debuggers refuse to attach without it. Once attached, you are inside the target's address space — you can change its control flow to call a libc function that writes the file you need. Think of it as a remote code execution primitive, not a read-only observation.",
    mitigationVersion: "2026-04",
  },

  9: {
    tier: "operator",
    goal:
      "This challenge contains a directory that is meant to hold additional sudo configuration files. An unprivileged user has write access to that directory. To solve the challenge, read /flag.",
    commands: ["ls", "sudo"],
    realWorldSkill:
      "Misconfigured permissions on sudo include directories are a surprisingly common finding in container base images and quickly-built developer VMs. A single writable directory here is a one-line end-to-end root.",
    approach:
      "Look at what the sudoers main file includes, not just the main file itself. The include directory accepts any new file dropped into it and applies it on the next sudo invocation. Write a new rule with the specific syntax sudo expects.",
    mitigationVersion: "2026-04",
  },

  10: {
    tier: "operator",
    goal:
      "This challenge contains a user database file that is world-writable through a misconfiguration. An unprivileged user can craft a new entry and add themselves as an additional root-equivalent account. To solve the challenge, read /flag.",
    commands: ["openssl", "cat"],
    realWorldSkill:
      "Ancient Linux lets you log in as any account listed in a single flat file. If an attacker can write that file, the authentication system is a suggestion. Real CTFs still find this in legacy images and embedded systems.",
    approach:
      "The file format has one field for a cryptographic hash of the password. Standard Unix utilities let you generate that hash on the fly. Pick a user-id that the system recognizes as special and append a new line — do not delete anything that is already there.",
    mitigationVersion: "2026-04",
  },

  11: {
    tier: "operator",
    goal:
      "This challenge contains a scheduled task that executes a script referring to a command by its short name. The current search order for command lookup can be influenced by a user with write access to a specific directory. To solve the challenge, read /flag.",
    commands: ["crontab", "ls", "cat"],
    realWorldSkill:
      "Scheduled tasks that use relative command names are legacy bugs that never die. Every DFIR engineer has found one within five minutes of landing on a compromised server, and every attacker who knows to look gets easy persistence from them.",
    approach:
      "The scheduled task runs as root on a periodic interval. The script it runs calls a simple utility by its short name rather than its full path. If you control any directory that appears earlier in the resolver's search order, you own the resolution.",
    mitigationVersion: "2026-04",
  },

  12: {
    tier: "operator",
    goal:
      "This challenge contains a user who is a member of a Linux group that grants effective control over a local service. The service is powerful enough that membership in the group is equivalent to being root. To solve the challenge, read /flag.",
    commands: ["groups", "docker"],
    realWorldSkill:
      "Certain Linux groups are effectively root by design. Adding a developer to one of them for convenience during dev is how real production incidents happen. Every sysadmin should be able to list these groups by heart.",
    approach:
      "Check what groups your user belongs to and match each against the short list of groups that imply root. The relevant group here owns a daemon that can mount any path into any container it spawns. Run a container that mounts the host filesystem somewhere it can read.",
    mitigationVersion: "2026-04",
  },

  // ──────────────────────────────────────────────────────────────
  // PHANTOM — Container escape discipline
  // ──────────────────────────────────────────────────────────────
  13: {
    tier: "phantom",
    goal:
      "This challenge places you inside a container that has the host's container-runtime control socket exposed inside it. You can talk to the host daemon directly. To solve the challenge, write the string PHANTOM-<your-username> to /host/proof on the host filesystem, then read /flag inside the original container.",
    commands: ["curl", "ls"],
    realWorldSkill:
      "The single most common container escape in real-world pentests is a mounted control socket — it appears in any environment where someone wanted a containerized CI agent to build images. Finding it is a muscle memory for every modern red teamer.",
    mitigationVersion: "2026-04",
  },

  14: {
    tier: "phantom",
    goal:
      "This challenge places you inside a container that was started with a flag that removes all isolation. The container sees the host's block devices. To solve the challenge, mount the host root filesystem inside the container and write /host-proof on it, then read /flag.",
    commands: ["fdisk", "mount"],
    realWorldSkill:
      "The single most misunderstood container flag in production makes every subsequent security boundary a polite request. This lab shows why — any attacker with shell access inside a container that has it is root on the host in about three commands.",
    mitigationVersion: "2026-04",
  },

  15: {
    tier: "phantom",
    goal:
      "This challenge places you inside a container that has the necessary privileges to mount kernel control interfaces. A specific kernel feature in an older interface allowed containers to register callbacks that the host kernel executed when processes exited. To solve the challenge, use that feature to run a command as host root that writes /flag-host, then read /flag.",
    commands: ["mount", "echo"],
    realWorldSkill:
      "This is the specific 2022 container escape that every container security course still teaches — not because it is common anymore but because the mechanism shows how a single kernel interface leak breaks every subsequent isolation layer. Understanding it is a prerequisite to reasoning about modern runtimes.",
    mitigationVersion: "legacy-2022",
  },

  16: {
    tier: "phantom",
    goal:
      "This challenge places you inside a container and exposes a specific quirk of how the container runtime launches new processes. A carefully crafted payload written at exactly the right moment can cause the next invocation of a runtime command to execute attacker code with the runtime's own privileges on the host. To solve the challenge, cause the host to execute a payload that writes /host-proof, then read /flag. The host will perform an administrative action against your container within 30 seconds of your payload being in place.",
    commands: ["ls", "cat"],
    realWorldSkill:
      "This is the template case for every subsequent container runtime vulnerability — a cross-boundary binary replacement bug where the container writes to a path the host is about to execute. Every modern runtime has been audited against this pattern, and new variants still appear.",
    mitigationVersion: "legacy-2019",
  },

  17: {
    tier: "phantom",
    goal:
      "This challenge gives you the ability to influence the configuration of a fresh container being started by a vulnerable version of the runtime. The configuration contains a field that, if set to an attacker-chosen path, causes the container's initial process to start with its working directory on the host filesystem instead of inside the container. To solve the challenge, exploit this to read /host/root/flag from the host and then write the captured flag to /flag inside your container.",
    commands: ["ls"],
    realWorldSkill:
      "This is the 2024 headline container escape — the pattern is file-descriptor leakage across a boundary, and its unique quality is that no amount of capability dropping or seccomp hardening prevents it. Understanding how the leaked descriptor survives the pivot-root is the single most important modern container security lesson.",
    mitigationVersion: "2024-01",
  },

  18: {
    tier: "phantom",
    goal:
      "This challenge places you inside a Kubernetes pod that was deployed with multiple dangerous flags enabled at once. Any one of them would be concerning — together they let you trivially reach the host. To solve the challenge, identify a combination of pod flags that exposes host resources, and use them to enter the host's process namespace and read /flag-host. Write the captured flag to /flag inside your pod.",
    commands: ["mount", "nsenter"],
    realWorldSkill:
      "Every Kubernetes pentester starts by looking for pods with this specific combination of misconfigurations. It is well documented and directly exploitable, which means defenders must know the exact combination by heart to harden against it — and attackers must know it cold.",
    mitigationVersion: "2026-04",
  },

  // ──────────────────────────────────────────────────────────────
  // GRADUATE — Kubectl-free + IMDS handoff
  // ──────────────────────────────────────────────────────────────
  19: {
    tier: "graduate",
    goal:
      "This challenge places you on a host that exposes a node-level Kubernetes control API on an unauthenticated port. The API is meant for the node agent to be managed by the control plane but is reachable by anyone who can send it a request. To solve the challenge, use the API to execute a command inside an existing pod of your choice on the node and read a file that pod holds at /secrets/flag. Write the captured flag to /flag on the host.",
    commands: ["curl"],
    realWorldSkill:
      "Self-managed Kubernetes clusters routinely ship with node-level APIs reachable without authentication — the fix requires explicit configuration that many operators miss. Finding and exploiting one of these is a top-five move in every real K8s engagement.",
    mitigationVersion: "2026-04",
  },

  20: {
    tier: "graduate",
    hidden: true,
    goal:
      "This is the final Phantom gate. You are an unprivileged process inside a Kubernetes pod on a real cluster. The pod has a service account token mounted at the standard path. Your mission: (1) use the token to reach the cluster control plane from inside the pod without any pre-installed client; (2) create a new workload that gives you root on the node; (3) enter the host and exfiltrate every secret persisted on disk by the control plane; (4) collect a temporary cloud credential from the node's metadata service and embed its access key in the final flag. Write the final flag to /flag-host on the node. You will need everything you have learned across all nineteen previous Phantom levels.",
    commands: ["curl", "cat", "ls"],
    realWorldSkill:
      "This is the full chain a real operator runs against a real compromised pod in a real 2026 incident. Ghost was selection. Phantom was training. This is graduation — and the flag you produce is a handoff token to the Mirage cloud track, because once you have IAM credentials the next discipline begins.",
    mitigationVersion: "2026-04",
  },
};

export function getPhantomLevelContent(idx: number): PhantomLevelContent | null {
  return PHANTOM_LEVEL_CONTENT[idx] ?? null;
}
