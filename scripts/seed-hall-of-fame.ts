/**
 * Seed the Hall of Fame with the 7 confirmed security reporters who landed
 * fixes between 2026-04-17 and 2026-04-21. Idempotent — skips a row if a
 * credit with the same (display_name, finding_title) already exists.
 *
 * Run locally: `npx tsx scripts/seed-hall-of-fame.ts`
 * Run on prod: `docker exec -w /app breachlab-platform-web-1 npx tsx scripts/seed-hall-of-fame.ts`
 *
 * Linked-user resolution: if a user with matching discord_username exists in
 * the users table, we link user_id so the golden-name treatment picks them
 * up and the security_score bump lands on the right profile. If no match,
 * the credit still appears publicly via display_name — the user can claim
 * later if they sign up.
 */
import { db } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";
import { securityCredits } from "../src/lib/hall-of-fame/schema";
import { and, eq, sql } from "drizzle-orm";

type Severity = "critical" | "high" | "medium" | "low";

type SeedCredit = {
  displayName: string;
  discordHandle: string;
  externalLink?: string;
  findingTitle: string;
  findingDescription: string;
  classRef: string;
  severity: Severity;
  prRef: string;
  securityScore: number;
};

const SCORE_BY_SEVERITY: Record<Severity, number> = {
  critical: 30,
  high: 20,
  medium: 10,
  low: 5,
};

const SEED: SeedCredit[] = [
  // _n_ — first white-hat reporter, foundational fixes
  {
    displayName: "_n_",
    discordHandle: "_n_",
    findingTitle: "Ghost L22 graduation-gate bypass via ghost-archivist",
    findingDescription:
      "Discovered that the SUID ghost-archivist was a relabelled cp /usr/bin/cat, turning it into an arbitrary file-read primitive. Reading the gatekeeper script itself leaked the expected-shard dictionary plus the graduation flag in cleartext — skipping the entire three-shard puzzle.",
    classRef: "Class 2: SUID general-purpose file-reader",
    severity: "critical",
    prRef: "platform#12",
    securityScore: SCORE_BY_SEVERITY.critical,
  },
  {
    displayName: "_n_",
    discordHandle: "_n_",
    findingTitle: "Phantom /opt verify-script flag leak",
    findingDescription:
      "Nine verifier scripts shipped with hardcoded FLAG=\"…\" literals in 0755 bodies. `cat /opt/verify-graduation.sh` from phantom0 returned the full graduation flag without solving any level.",
    classRef: "Class 3: Flag hardcoded in world-readable verifier",
    severity: "critical",
    prRef: "phantom#12",
    securityScore: SCORE_BY_SEVERITY.critical,
  },
  {
    displayName: "_n_",
    discordHandle: "_n_",
    findingTitle: "Chain-integrity PoC + flag-value replay warning",
    findingDescription:
      "Warned about the 32 phantom chain-passwords captured during pre-reset sessions. Triggered the full rotation + DB sha256 resync + submission reset on 2026-04-21.",
    classRef: "Class 9: Flag-value replay window",
    severity: "high",
    prRef: "phantom#19",
    securityScore: SCORE_BY_SEVERITY.high,
  },

  // sML — prolific reporter across containers + platform
  {
    displayName: "sML",
    discordHandle: "sml",
    findingTitle: "Phantom L11 /opt/webapp/repo world-readable (755)",
    findingDescription:
      "Git repo containing APP_SECRET in first-commit history was mode 755 root:root — any phantomN or flagkeeperM could cd in and `git log -p` to extract the secret and skip L0-L10 entirely.",
    classRef: "Class 10: Cross-level repo/dir traversal bypass",
    severity: "critical",
    prRef: "phantom#28",
    securityScore: SCORE_BY_SEVERITY.critical,
  },
  {
    displayName: "sML",
    discordHandle: "sml",
    findingTitle: "L23 container-log dict replay window",
    findingDescription:
      "docker-socket-emulator kept its CONTAINERS dict across all requests forever. A legit L23 solver's container id could be reused hours later by any phantomN via `curl :2375/containers/<id>/logs` to retrieve the flag, bypassing L0-L22.",
    classRef: "Class 1: Cross-level information disclosure",
    severity: "critical",
    prRef: "phantom#32",
    securityScore: SCORE_BY_SEVERITY.critical,
  },
  {
    displayName: "sML",
    discordHandle: "sml",
    findingTitle: "L24 verify-pod-escape PID echo + HISTFILE gap",
    findingDescription:
      "Verifier printed the host-init PID directly, spoiling the enumeration step. Separately, phantom24 had no .bl-allow-history marker, so bash history was wiped mid-session and the verifier's grep-history check always failed.",
    classRef: "Class 8: Brief ↔ environment mismatch",
    severity: "high",
    prRef: "phantom#33",
    securityScore: SCORE_BY_SEVERITY.high,
  },
  {
    displayName: "sML",
    discordHandle: "sml",
    findingTitle: "Cosmetic root-lock: NOPASSWD sudo ALL on phantom12–30",
    findingDescription:
      "Demonstrated `sudo /bin/bash` from phantom28 → uid=0 trivially. Root lock in shadow (!$y$…) was decorative while 12 phantom users held blanket NOPASSWD: ALL. Scoped sudoers pass now keeps ALL only where the declared level challenge needs privileged work.",
    classRef: "Class 14: Cosmetic root-lock + over-broad NOPASSWD sudo",
    severity: "high",
    prRef: "phantom#36",
    securityScore: SCORE_BY_SEVERITY.high,
  },

  // VoxFox — same-day L7 + L8 catches
  {
    displayName: "VoxFox",
    discordHandle: "voxfox",
    findingTitle: "L7 SUID system() drops euid, flag unreadable",
    findingDescription:
      "Command injection in system-checker landed with uid=phantom7 not flagkeeper7 — bash detected the SUID mismatch and dropped euid. First fix attempt (setuid) was non-root-ineffective, follow-up setreuid equalised both ids. Caught the broken fix within 5 minutes of the first deploy.",
    classRef: "Class 13: SUID shell-out euid drop",
    severity: "critical",
    prRef: "phantom#35",
    securityScore: SCORE_BY_SEVERITY.critical,
  },
  {
    displayName: "VoxFox",
    discordHandle: "voxfox",
    findingTitle: "L8 ptrace_scope=1 silently inherited from host",
    findingDescription:
      "gdb attach from phantom8 failed despite same-uid target. Root cause: entrypoint `echo 0 > /proc/sys/kernel/yama/ptrace_scope` silently failed because yama isn't a namespaced sysctl. Fix: daemon opts in via prctl(PR_SET_PTRACER_ANY).",
    classRef: "Class 15: Entrypoint sysctl silent fail (non-namespaced)",
    severity: "critical",
    prRef: "phantom#38",
    securityScore: SCORE_BY_SEVERITY.critical,
  },
  {
    displayName: "VoxFox",
    discordHandle: "voxfox",
    findingTitle: "L5 File Authority intended-path clarification",
    findingDescription:
      "Surfaced that root's hash in /etc/shadow is !$y$… (locked, nologin) and only flagkeeper5's hash is the crack target. Led to a password-set fix ensuring the target hash is actually present in rockyou.txt.",
    classRef: "Class 8: Brief ↔ environment mismatch",
    severity: "medium",
    prRef: "phantom#34",
    securityScore: SCORE_BY_SEVERITY.medium,
  },

  // hy — ops key rotation catch + L7/L8 parallel confirmation
  {
    displayName: "hy",
    discordHandle: "hy",
    findingTitle: "L16 ops SSH keypair missed in flag rotation",
    findingDescription:
      "Pointed out that the 2026-04-21 morning flag rotation touched chain-passwords and canonical flag values but not the gitignored internal/keys/ops_key. Anyone who exfiltrated before the rotation retained a valid login to ops@10.13.37.30 and could read /opt/oracle.py directly, bypassing L17-L26.",
    classRef: "Class 9: Flag-value replay window",
    severity: "critical",
    prRef: "phantom#32",
    securityScore: SCORE_BY_SEVERITY.critical,
  },
  {
    displayName: "hy",
    discordHandle: "hy",
    findingTitle: "L7 + L8 independent catch",
    findingDescription:
      "Independently confirmed both the L7 setuid-vs-setreuid euid drop and the L8 yama ptrace_scope block, within 30 minutes of VoxFox. Two-reporter independent confirmation validated the exploit paths before the fixes landed.",
    classRef: "Class 13 + Class 15",
    severity: "high",
    prRef: "phantom#35, phantom#38",
    securityScore: SCORE_BY_SEVERITY.high,
  },

  // 0Xm!$k — L8 cmdline leak (the foundational /proc cross-level finding)
  {
    displayName: "0Xm!$k",
    discordHandle: "0xm1sk",
    findingTitle: "L8 cmdline world-readable flag leak",
    findingDescription:
      "Reported that the L8 daemon carried its secret in argv (`python3 -c \"secret = 'Ptr4c3_1nj3ct3d'; …\"`). /proc/<pid>/cmdline is world-readable, so `ps aux -ww | grep Ptr4c3` from phantom0 returned the L8 flag and skipped levels 1-7. Became Class 1 in the auditor catalog.",
    classRef: "Class 1: Cross-level information disclosure via /proc",
    severity: "critical",
    prRef: "phantom#15",
    securityScore: SCORE_BY_SEVERITY.critical,
  },
  {
    displayName: "0Xm!$k",
    discordHandle: "0xm1sk",
    findingTitle: "wtmp/lastlog world-readable — player IP leakage",
    findingDescription:
      "Ubuntu default mode 664 on /var/log/wtmp allowed `last -a` from phantom0/ghost0 to enumerate every other player's SSH origin IP. Fixed by entrypoint chmod 600 right before sshd start.",
    classRef: "Class 1: Cross-level information disclosure via /proc",
    severity: "high",
    prRef: "phantom#14, ghost#13",
    securityScore: SCORE_BY_SEVERITY.high,
  },
  {
    displayName: "0Xm!$k",
    discordHandle: "0xm1sk",
    findingTitle: "phantom3 SSH Connection-reset — pam_limits glob gap",
    findingDescription:
      "Surfaced that the limits.conf `phantom*` glob didn't expand (pam_limits doesn't support user globs). No phantomN had nproc=100, and one broken LD_PRELOAD chain on L3 spawned 501 processes, wedging sshd for every subsequent player. Fixed by expanding to 43 literal users.",
    classRef: "Class 5: Missing / broken level dependencies",
    severity: "high",
    prRef: "phantom#31",
    securityScore: SCORE_BY_SEVERITY.high,
  },

  // meesterbjangles — post-rebuild regression catch
  {
    displayName: "meesterbjangles",
    discordHandle: "meesterbjangles",
    findingTitle: "Ghost L20 cron daemon missing post-rebuild",
    findingDescription:
      "cron was ad-hoc installed via docker exec without a Dockerfile entry. The PR #9 chattr rebuild wiped it and L20 silently broke (entrypoint failsafe logged FATAL, verifier returned empty). Fixed by adding cron to the apt install line.",
    classRef: "Class 11: Cross-agent / cross-rebuild prod state drift",
    severity: "high",
    prRef: "ghost#11",
    securityScore: SCORE_BY_SEVERITY.high,
  },

  // hypee — submit-logic chain-integrity gap
  {
    displayName: "hypee",
    discordHandle: "hypee",
    findingTitle: "First-blood via 0-point orphan submission",
    findingDescription:
      "Demonstrated that `submission exists` as the prior-level check let a phantom/15 first-blood claim ride a 0-point phantom/14 orphan — without actually solving L14. Fix gated first-blood on pointsAwarded > 0 and ultimately led to strict-order enforcement on the phantom track.",
    classRef: "Class 6: Chain-integrity bypasses on /submit",
    severity: "high",
    prRef: "platform#33, platform#39",
    securityScore: SCORE_BY_SEVERITY.high,
  },
];

async function main() {
  let created = 0;
  let skipped = 0;
  let linkedUsers = 0;

  for (const c of SEED) {
    // Look up linked user by discord_username (case-insensitive).
    const [linked] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.discordUsername}) = lower(${c.discordHandle})`)
      .limit(1);

    // Skip if (displayName, findingTitle) already exists.
    const [existing] = await db
      .select({ id: securityCredits.id })
      .from(securityCredits)
      .where(
        and(
          eq(securityCredits.displayName, c.displayName),
          eq(securityCredits.findingTitle, c.findingTitle),
        ),
      )
      .limit(1);
    if (existing) {
      skipped++;
      continue;
    }

    await db.insert(securityCredits).values({
      userId: linked?.id ?? null,
      displayName: c.displayName,
      discordHandle: c.discordHandle,
      externalLink: c.externalLink ?? null,
      findingTitle: c.findingTitle,
      findingDescription: c.findingDescription,
      classRef: c.classRef,
      severity: c.severity,
      prRef: c.prRef,
      securityScore: c.securityScore,
      status: "confirmed",
      awardedAt: new Date(),
      notes: "seeded from 2026-04-17 through 2026-04-21 session",
    });

    // Bump the linked user's denormalised security score + flag.
    if (linked) {
      linkedUsers++;
      await db
        .update(users)
        .set({
          isHallOfFame: true,
          securityScore: sql`${users.securityScore} + ${c.securityScore}`,
        })
        .where(eq(users.id, linked.id));
    }

    created++;
    console.log(
      `  + ${c.displayName} — ${c.findingTitle.slice(0, 60)}${c.findingTitle.length > 60 ? "…" : ""} ${linked ? "(linked)" : "(anon)"}`,
    );
  }

  console.log(
    `\nDone. Created ${created}, skipped ${skipped}, linked-to-account ${linkedUsers}.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
