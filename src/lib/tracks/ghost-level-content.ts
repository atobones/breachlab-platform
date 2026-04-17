// Prose for each Ghost level page. Hardcore mode — goals describe only WHAT
// you need to do, not HOW. Commands list shows only foundational tools.
// Tips and flag hints are intentionally absent. Figuring out which flag of
// which tool to use is part of the level.

export type LevelContent = {
  goal: string;
  commands: string[];
  realWorldSkill: string;
  hidden?: boolean;
};

export const GHOST_LEVEL_CONTENT: Record<number, LevelContent> = {
  0: {
    goal:
      "The password for the next level is somewhere inside your home directory. Find it. This level teaches you the single most important skill: moving around a Linux system and reading files.",
    commands: ["ls", "cd", "cat"],
    realWorldSkill:
      "Getting your bearings on a box you have never seen before. Every single engagement — offensive or defensive — starts here.",
  },
  1: {
    goal:
      "The password is in a file whose name is weird. A dash. A space. Three dots. A name that looks like a flag. You cannot just cat it and expect it to work. Learn the shell well enough that weird filenames stop slowing you down.",
    commands: ["cat", "ls", "man"],
    realWorldSkill:
      "Shell quoting is the foundation for shell injection, path traversal, and every real attack that abuses how operators pass arguments to other programs.",
  },
  2: {
    goal:
      "Not everything lives in plain sight. The password you want is hiding. The files you see first are decoys designed to waste your time.",
    commands: ["ls", "cat", "find"],
    realWorldSkill:
      "Forensics and malware persistence analysis. Attackers hide their tools in exactly this way. Defenders hunt exactly this way.",
  },
  3: {
    goal:
      "You can see files you cannot read. The operating system is telling you something about who you are. Read the map. Use the system to find a file whose group matches what the system says about you.",
    commands: ["find", "ls", "cat"],
    realWorldSkill:
      "Linux permissions are the entire foundation of privilege escalation. This is level zero of real privesc.",
  },
  4: {
    goal:
      "A directory full of log files. Most of them are noise. One line in one file contains the password, labelled very clearly by the person who left it behind. Find it without opening files one by one.",
    commands: ["grep", "find"],
    realWorldSkill:
      "Threat hunting. This is the core loop of every SOC analyst on the planet — find the needle in the log haystack.",
  },
  5: {
    goal:
      "Something on this machine is listening on a port it shouldn't be. Find the port. Talk to it. It will tell you what to do next.",
    commands: ["nc", "curl"],
    realWorldSkill:
      "Network reconnaissance and banner grabbing. The opening move in every pentest.",
  },
  6: {
    goal:
      "The environment variables on this system are doing too much. One of them is leaking something it shouldn't. Read them all. Decode what needs decoding.",
    commands: ["env", "echo"],
    realWorldSkill:
      "Credential extraction. Environment variables are how secrets leak into process lists, crash logs, and CI pipelines every single day.",
  },
  7: {
    goal:
      "There is a file. It does not look like text. It looks like hex. Or does it? Whatever it is, it is wrapping something else. Peel the layers until you reach the password.",
    commands: ["xxd", "base64"],
    realWorldSkill:
      "Malware analysis. Real-world payloads are almost always encoded two or three times deep to evade simple detection.",
  },
  8: {
    goal:
      "The password is not on disk. It never was. It lives inside a process that is running right now. Find the process. Read what the kernel already knows about it.",
    commands: ["ps", "cat"],
    realWorldSkill:
      "Fileless malware analysis and live incident response. This is what an IR engineer does at 3am when a box is already compromised and disk forensics is too slow.",
  },
  9: {
    goal:
      "A binary blob. Not text. Somewhere inside it there is human-readable ASCII sitting next to a very specific marker. Pull the text out without writing any code of your own.",
    commands: ["strings", "grep", "file"],
    realWorldSkill:
      "Malware string analysis. Before you reverse a sample you run strings to find URLs, flags, and the personality of whoever wrote it. This is the single highest-ROI move in early-stage sample triage.",
  },
  10: {
    goal:
      "A file full of passwords. Exactly one of them occurs only once — the rest are noise and duplicates. Find the unique one without reading the file by eye.",
    commands: ["sort", "uniq", "wc"],
    realWorldSkill:
      "Log deduplication at scale. The first tool in the belt of every SIEM engineer who has to find the one anomalous event out of a million identical ones.",
  },
  11: {
    goal:
      "A file wrapped in three compression formats, nested. Identify each layer, unwrap it, identify the next. Keep going until you reach plaintext. Figure out which tool each layer needs on your own.",
    commands: ["file", "tar", "gzip", "bzip2"],
    realWorldSkill:
      "Real malware payloads are nested three or four layers deep to defeat simple sandboxes. This is the exact loop an analyst runs on a fresh sample — strip each layer, identify the next, keep going.",
  },
  12: {
    goal:
      "There is no password for the next level. There is a private key. Use it. Learn what SSH key authentication actually is and why the world runs on it.",
    commands: ["ssh", "cat"],
    realWorldSkill:
      "Key-based auth is how every production server on the planet is accessed. If you cannot use a private key you cannot do the job. Not one job. Zero.",
  },
  13: {
    goal:
      "A service on localhost is listening on a port. It will trade you the next password — but only if you speak to it with the right word on the first line. No browser, no client library.",
    commands: ["nc", "curl"],
    realWorldSkill:
      "Every production service talks to other services over TCP. Knowing how to hand-craft a request without a client library is the difference between a pentester who finds issues and one who only runs tools.",
  },
  14: {
    goal:
      "Same idea as the last level, but now the service speaks TLS. Plain netcat will not work. Find a tool that speaks TLS from the command line. Send it what it wants.",
    commands: ["openssl", "curl"],
    realWorldSkill:
      "Ninety-nine percent of traffic on the internet is now TLS. Every real-world recon, every API poke, every banner grab demands a TLS-capable client.",
  },
  15: {
    goal:
      "Somewhere in a range of ports, exactly one of them is speaking TLS and will hand you the next password if you greet it correctly. Scan the range. Find the live one. Speak TLS to it. Notice the difference between a refused connection, a timeout, and a handshake failure — each one tells you something different about what is on the other side.",
    commands: ["nmap", "openssl", "nc"],
    realWorldSkill:
      "Discovery is the first step in every engagement. If you cannot tell the difference between a closed port, a filtered port, and an open port speaking an unexpected protocol, you will miss the entry point.",
  },
  16: {
    goal:
      "Two files that look almost the same. The password is the line that differs. Do not read them by eye.",
    commands: ["diff", "comm"],
    realWorldSkill:
      "Code review, config drift detection, forensic comparison of a known-good baseline to a compromised system. diff is a core skill of every SOC and DFIR engineer.",
  },
  17: {
    goal:
      "The previous level's password works, but as soon as you log in, your session is killed. The server runs a startup script that boots you the moment you arrive. You have to read a file without ever getting an interactive shell.",
    commands: ["ssh", "cat"],
    realWorldSkill:
      "Restricted environments are everywhere in 2026: bastion hosts, container entrypoints, CI runners. Getting useful work done when someone has tried to lock down your shell is core to both attack and defense.",
  },
  18: {
    goal:
      "You can see a binary that belongs to the next level's user and has strange permissions set on it. Read the manual for ls. Figure out what those permissions mean. Use the binary to read a file your user normally cannot touch.",
    commands: ["ls", "./", "cat"],
    realWorldSkill:
      "SUID is the single most common Linux privilege escalation path on earth. This is the first taste of what the Phantom track will cover in depth.",
  },
  19: {
    goal:
      "A service wants both a password you already have and a 4-digit PIN you do not. There are 10,000 possible PINs. Try them all. Write a shell script — this is the level where you stop typing commands one at a time and start writing code that types them for you.",
    commands: ["bash", "for", "nc", "printf"],
    realWorldSkill:
      "Every security engineer writes their own tools. You will write more throwaway scripts in a week than you will run someone else's tools. This is the level where that journey starts.",
  },
  20: {
    goal:
      "Something is running on a schedule. Find what. Find where it writes. Find what it reads. The answer is not in your home directory — it is in the corners of the filesystem where scheduled tasks live.",
    commands: ["ls", "cat", "find"],
    realWorldSkill:
      "Cron is a privilege escalation gold mine and a persistence favorite. Every DFIR engineer checks cron directories in the first five minutes of a compromise investigation.",
  },
  21: {
    goal:
      "A local git repository was pulled off an internal server. It has a dirty history. Somewhere in the log, someone committed something they shouldn't have and then tried to cover it up. Find it. Read it. Full workflow: clone, log, diff, branches, reflog, tags.\n\nBefore you leave — take one last look at this machine. Everything you have ever learned on Ghost is written on it somewhere. Not every door opens on the first knock.",
    commands: ["git"],
    realWorldSkill:
      "Git history forensics is the number-one way real-world secrets leak. Every supply-chain attack in 2024-2026 either started here or passed through here. This is the only Ghost level that maps directly onto the Nexus (CI/CD) track that comes later.",
  },
  22: {
    goal:
      "You made it past every selection gate. Twenty-two levels. There is one file left on this machine that is not yours to read — it is classified, split into three shards, and each shard is guarded by a different technique from earlier in the track.\n\nShard 1 is hiding in a binary blob. Pull it out.\nShard 2 is wrapped in base64. Unwrap it.\nShard 3 belongs to root. A tool on the system will read it for you, if you ask it right.\n\nThen find the gatekeeper listening on the machine and hand it all three shards. If you have them all and they are in the right order, it will release the graduation flag.",
    commands: ["strings", "base64", "find", "nc"],
    realWorldSkill:
      "Ghost was selection. This is graduation. You will not solve this with one tool — only by combining everything you practiced. Clear this and you are no longer a beginner, you are an operative. Every future BreachLab track is open to you. The real work starts now.",
    hidden: true,
  },
};

export function getLevelContent(idx: number): LevelContent | null {
  return GHOST_LEVEL_CONTENT[idx] ?? null;
}
