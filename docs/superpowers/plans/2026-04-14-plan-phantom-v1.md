# BreachLab Platform — Plan: Phantom v1 (Max Build)

**Goal:** Ship BreachLab's second track — **Phantom** — as a complete, hardcore, 2026-current wargame teaching Linux privesc + container escape + Kubernetes pod escape. 20 levels (19 public + 1 hidden chained graduation), 4 visible difficulty tiers (Recruit / Operator / Phantom / Graduate), progressive "Show approach" hint system on Operator tier, honor roll page, generic track-parameterized certificate, `phantom_master` gold badge, full e2e coverage. Out of scope: SSH container infrastructure (ops task — platform ships content and UI only).

**Research inputs:** `.planning/research/SYNTHESIS.md` + 4 source reports. Level curriculum is locked; tier assignments and teaching arcs follow pwn.college "ladder-of-one" + PortSwigger Apprentice/Practitioner/Expert model.

**Architecture:** Reuse existing tracks/levels/flags/submissions/badges schema — **zero migrations**. New files only. Generic certificate route `/u/[username]/certificate/[track]` parameterizes existing Ghost cert. Tier labels + approach hints live in content file (not DB).

**Out of scope:**
- SSH container build (phantom0..phantom19 users, nested Docker/K8s/runc infra) — separate ops sprint
- `used_hint` telemetry column (add later, not needed for v1 UX)
- Phantom speedrun leaderboard (research: avoid cheating metrics for privesc track — honor roll only)
- Kernel CVE labs (Kernel Wraith future track)
- AWS/GCP/Azure IAM (Mirage)
- BuildKit / CI/CD CVEs (Nexus)

---

## File structure

```
breachlab-platform/
├── src/
│   ├── lib/
│   │   ├── badges/
│   │   │   ├── types.ts                             -- +phantom_master kind
│   │   │   └── award.ts                             -- +isPhantomGraduate signal
│   │   ├── tracks/
│   │   │   ├── phantom-level-content.ts             -- NEW: 20 entries, tier + approach + mitigationVersion
│   │   │   ├── submit.ts                            -- +phantom graduate detection
│   │   │   └── bonus.ts                             -- already generic, verify works for phantom
│   │   └── certificate/
│   │       └── queries.ts                           -- parameterize by track slug
│   ├── app/
│   │   ├── tracks/phantom/
│   │   │   ├── page.tsx                             -- NEW: track overview with tier groups + SSH cmd
│   │   │   ├── [level]/page.tsx                     -- NEW: level detail with tier badge + approach
│   │   │   └── graduates/page.tsx                   -- NEW: honor roll
│   │   ├── u/[username]/certificate/
│   │   │   └── [track]/page.tsx                     -- NEW: generic cert route
│   │   └── page.tsx                                 -- update Phantom description
│   └── components/
│       ├── badges/BadgePill.tsx                     -- +phantom_master gold
│       ├── tracks/
│       │   ├── TierBadge.tsx                        -- NEW
│       │   └── ApproachHint.tsx                     -- NEW (client, 20-min localStorage gate)
│       ├── certificate/
│       │   └── PhantomCertificate.tsx               -- NEW variant
│       └── TracksNav.tsx                            -- Phantom SOON → LIVE
├── scripts/
│   └── seed-phantom.ts                              -- NEW: 20 entries
└── tests/
    ├── unit/
    │   ├── badges/award.test.ts                     -- +phantom cases
    │   └── tracks/
    │       └── phantom-content.test.ts              -- NEW: invariants (count, tier, goal length, no spoilers)
    └── e2e/
        └── phantom-master.spec.ts                   -- NEW: full graduate flow + certificate + honor roll
```

---

## Level curriculum (locked — content from SYNTHESIS.md)

```
🟢 Recruit (5) — Sudo domain mastery
 0  Recon gateway — id/sudo -l/getcap -r/SUID find/.dockerenv (method, not exploit)
 1  Sudo NOPASSWD simple — GTFOBin on one allowed binary
 2  Sudo env_keep + LD_PRELOAD — write/compile/preload a .so
 3  Sudo wildcard arg injection — tar/rsync/chown
 4  CVE-2023-22809 sudoedit — EDITOR bypass of allowed-files list

🟡 Operator (8) — Caps + writable files + legacy docker
 5  PwnKit CVE-2021-4034 — pkexec polkit logic bug (different auth path)
 6  cap_setuid+ep — python -c os.setuid(0), instant root
 7  cap_dac_read_search+ep — exfil /etc/shadow + /root/.ssh/id_rsa + kubeconfig
 8  cap_sys_ptrace+ep — attach to root process, inject shellcode
 9  Writable /etc/sudoers.d/ — drop NOPASSWD ALL rule
 10 Writable /etc/passwd — craft hash with openssl passwd, uid=0 user
 11 PATH hijack via writable cron — cron script calls relative binary
 12 Docker group = root — docker run -v /:/h chroot /h

🔴 Phantom (6) — Container escape discipline
 13 Mounted docker.sock → sibling privileged — raw HTTP API to /var/run/docker.sock
 14 --privileged + host block device — fdisk -l, mount /dev/sda1, write SSH key
 15 cgroup v1 release_agent — RDMA cgroup + notify_on_release (historic 2022)
 16 CVE-2019-5736 runc /proc/self/exe — cross-boundary binary replacement
 17 CVE-2024-21626 Leaky Vessels — malicious OCI WORKDIR, fd leak, signature 2026 lab
 18 K8s Bad Pods — privileged + hostPath + hostPID + nsenter --target 1

⚫ Graduate (2) — Kubectl-free + handoff
 19 Kubelet :10250 unauth exec — alternative node-level API path
 20 (hidden) Final chained graduation:
    Low-priv pod → /var/run/secrets/.../token → curl kubernetes.default.svc
    → create privileged pod → nsenter PID 1 → read etcd snapshot
    → harvest AWS IMDS creds → write signed Phantom Operative token
```

Point curve (harder → higher): Recruit 300→380 (80 pt steps), Operator 420→700 (40 pt steps), Phantom 800→1100 (60 pt steps), Graduate 1200→2000 (hidden graduation = 2000). Matches Ghost's "late levels worth more" principle.

---

## Task 1: `phantom_master` badge infra + decideBadgesToAward (pure, TDD)

**Files:** `src/lib/badges/types.ts`, `src/components/badges/BadgePill.tsx`, `src/lib/badges/award.ts`, `tests/unit/badges/award.test.ts`.

- Add `"phantom_master"` to `BadgeKind` union + KINDS set + `BADGE_LABEL: "Phantom Operative"`.
- Add pill color: `phantom_master: "border-red text-red font-bold"` (crimson tone, distinct from gold `ghost_graduate`).
- Extend `AwardContext`: `isPhantomGraduate?: boolean`.
- Extend `decideBadgesToAward`: push `{ kind: "phantom_master", refId: ctx.trackId }` when flag true.
- Unit tests: solo grant, omission, combined with first_blood + track_complete (mirror existing ghost_graduate tests).

Commit: `feat(badges): phantom_master kind + award decision`

---

## Task 2: Phantom content file (TDD via invariant test)

**Files:** `src/lib/tracks/phantom-level-content.ts`, `tests/unit/tracks/phantom-content.test.ts`.

### Content shape (extend LevelContent)

```ts
export type PhantomTier = "recruit" | "operator" | "phantom" | "graduate";

export type PhantomLevelContent = {
  tier: PhantomTier;
  goal: string;              // 2-4 sentences, PortSwigger template
  commands?: string[];       // suggested starting toolset (optional)
  realWorldSkill: string;    // one-sentence industry connection
  approach?: string;         // 2-4 sentences category hint, Operator tier only
  mitigationVersion: string; // "2026-04" or "legacy-2022" etc
  hidden?: boolean;
};

export const PHANTOM_LEVEL_CONTENT: Record<number, PhantomLevelContent> = { ... }
```

### 20 entries (write ALL now, don't skip any)

Follow the PortSwigger goal template strictly: **framing (1 sent) → win condition (1 sent) → starting context (optional 1 sent) → out-of-scope (optional 1 sent)**. Max 4 sentences. Never name the technique. Never name the tool. Always state win artifact.

Sample (level 2):

```ts
2: {
  tier: "recruit",
  goal:
    "This challenge contains a sudo configuration that preserves a specific environment variable across privilege elevation. An unprivileged user can use this to execute attacker-controlled code as root. To solve the challenge, read /flag. You do not need to exploit the kernel or escape a container.",
  commands: ["gcc", "cc", "ls", "sudo -l"],
  realWorldSkill: "Sudoers `env_keep` misconfigurations appear in real Linux hardening audits constantly. This is one of the cleanest demonstrations of why environment variables are a capability, not a convenience.",
  approach: "Look at what sudo -l reveals about preserved environment variables. Linux's dynamic linker reacts to certain env vars in ways most operators forget. You will need to produce and load a small binary artifact of your own — ordinary shell tricks will not work.",
  mitigationVersion: "2026-04",
}
```

Content invariant test checks all 20 entries:
- Count = 20
- Every tier is one of the 4 values
- Level 20 has `hidden: true` and `tier: "graduate"`
- Every `goal` ≤ 4 sentences (split on `/[.!?]+\s/`)
- No goal contains forbidden spoiler words (`CVE-`, `LD_PRELOAD`, `docker.sock`, `nsenter`, `/var/run/docker.sock`, `SUID`, `setuid`, `chroot`, `release_agent`, `kubelet`) — these may appear in realWorldSkill but NOT in the goal field
- `approach` present for all levels where tier === "operator"; absent for recruit/phantom/graduate
- `mitigationVersion` matches regex `^(20\d{2}-(0[1-9]|1[0-2])|legacy-20\d{2})$`

Commit: `feat(phantom): 20-level content file with tier + approach + mitigation version`

---

## Task 3: Seed script

**Files:** `scripts/seed-phantom.ts`.

Mirror `scripts/seed-ghost.ts` exactly, with:

- `PHANTOM_LEVELS` array of 20 entries — 19 public (idx 0-18), 1 hidden (idx 20 — **skipping idx 19? NO — idx 19 is G19 Kubelet, idx 20 is hidden graduation**. Sequential: 0..19 public, 20 hidden = 21 rows. Wait, 20 levels total. Let me restate: idx 0..18 public (19 levels: R0-R4, O5-O12, P13-P18), idx 19 G19 kubelet PUBLIC, idx 20 hidden graduation. That's 20 rows in levels, 19 non-hidden + 1 hidden.)
- Track insert: `slug='phantom'`, `name='Phantom'`, `description='Post-exploitation — Linux privesc, container escape, Kubernetes pod escape.'`, `status='live'`, `orderIdx=1`
- Points curve: R0-R4 = 300/320/340/360/380. O5-O12 = 420/460/500/540/580/620/660/700. P13-P18 = 800/860/920/980/1040/1100. G19 = 1200. Hidden G20 = 2000.
- `pointsFirstBloodBonus: l.idx === 20 ? 0 : 50` (no first-blood bonus on hidden)
- Hidden level description prefix `[HIDDEN] Graduation gate — unlocked after solving all 19 public levels`
- Flag format: `FLAG{phantom_l<idx>_<randomHex>}`
- Append to `.seed-flags.phantom.local.txt` (gitignored, same append pattern as ghost seed)

Add to `package.json` `scripts`: `"seed:phantom": "tsx scripts/seed-phantom.ts"`.

Run `npm run seed:phantom` locally, verify 20 rows in `levels` table, commit.

Commit: `feat(phantom): seed script for 20 levels`

---

## Task 4: Generic bonus-unlock logic + submitFlag phantom wiring

**Files:** `src/lib/tracks/bonus.ts` (verify generic), `src/lib/tracks/submit.ts`.

- `hasUnlockedHiddenBonus(userId, trackId)` is already generic — it filters hidden levels via `isHiddenLevel(description)`. Works for Phantom without change. Write a one-line unit test confirming it returns false for a user with 18/19 public phantom submissions and true with 19/19.
- Extend `submitFlag`: add graduate detection mirror:

```ts
const isPhantomGraduate =
  trackRow?.slug === "phantom" && level.idx === 20;

let alreadyPhantomGraduate = false;
if (isPhantomGraduate) {
  const existing = await db
    .select({ id: badges.id })
    .from(badges)
    .where(
      and(
        eq(badges.userId, userId),
        eq(badges.kind, "phantom_master"),
        eq(badges.refId, level.trackId),
      ),
    )
    .limit(1);
  alreadyPhantomGraduate = existing.length > 0;
}

// pass into decideBadgesToAward alongside isGhostGraduate
```

Track completion detection already filters hidden levels via `publicFilter` — no change needed.

Commit: `feat(phantom): wire phantom_master graduate award in submitFlag`

---

## Task 5: TierBadge + ApproachHint components

**Files:** `src/components/tracks/TierBadge.tsx`, `src/components/tracks/ApproachHint.tsx`.

### TierBadge (server component)

```tsx
const TIER_STYLE: Record<PhantomTier, string> = {
  recruit: "border-green text-green",
  operator: "border-amber text-amber",
  phantom: "border-red text-red",
  graduate: "border-red text-red font-bold",
};
const TIER_LABEL: Record<PhantomTier, string> = {
  recruit: "RECRUIT",
  operator: "OPERATOR",
  phantom: "PHANTOM",
  graduate: "GRADUATE",
};
export function TierBadge({ tier }: { tier: PhantomTier }) {
  return (
    <span className={`inline-block px-2 py-0.5 text-xs uppercase tracking-widest border ${TIER_STYLE[tier]}`}>
      {TIER_LABEL[tier]}
    </span>
  );
}
```

### ApproachHint (client component)

Only rendered on Operator-tier levels. Renders:
- Collapsed state: `<button>Show approach (unlocks in XX:XX)</button>` with localStorage-tracked first-visit timestamp per `(username, levelIdx)` key.
- After 20 minutes from first visit: button becomes active, clicking reveals the `approach` text in a dashed-border box.
- After reveal: persists open for the session.
- Key format: `phantom-approach-${username}-${idx}`.

Timer update via `setInterval(1s)`, clears on unmount.

No tests — UI fidelity, visually verified in e2e.

Commit: `feat(phantom): TierBadge + ApproachHint components`

---

## Task 6: `/tracks/phantom/page.tsx` + `[level]/page.tsx`

**Files:** `src/app/tracks/phantom/page.tsx`, `src/app/tracks/phantom/[level]/page.tsx`.

### Track overview page

Server component. Reuses `getTrackBySlug("phantom")` + `getLevelsForTrack(trackId)` + `getFirstBloodByLevel()` + `hasUnlockedHiddenBonus`. Renders:

1. **Header**: `Phantom` title (red), one-paragraph mission framing (hardcore post-exploitation), tier legend (4 tier badges inline with one-sentence explanation each).
2. **SSH access block**: copyable command `ssh phantom0@phantom.breachlab.<tld> -p 2223`, with `<p class="text-muted">SSH endpoint being provisioned. Follow @BreachLab for launch announcement.</p>` fallback.
3. **Level table grouped by tier** — Recruit, then Operator, then Phantom, then Graduate. Each row: idx, title, tier badge, points, solved indicator (if logged in), first-blood username.
4. **Hidden level** — only rendered if `bonusUnlocked`, separate "Graduation" section at bottom.
5. **Honor roll CTA**: "See all Phantom Operatives → /tracks/phantom/graduates".

Reuse `LevelTable` component where possible; may need a variant `PhantomLevelTable` with tier column.

### Level detail page

Server component at `/tracks/phantom/[level]/page.tsx`. Mirror `src/app/tracks/ghost/[level]/page.tsx` but:
- Import from `phantom-level-content.ts` (create a `getPhantomLevelContent(idx)` helper)
- Large `TierBadge` at top next to title
- Render `realWorldSkill` after `goal`
- If `tier === "operator"`, render `<ApproachHint approach={...} levelIdx={idx} username={user?.username} />`
- Render `mitigationVersion` as muted footer line
- Hidden-level 404 gate same as ghost (`hasUnlockedHiddenBonus`)
- First-blood display same pattern

Commit: `feat(phantom): track overview + level detail pages`

---

## Task 7: Honor roll `/tracks/phantom/graduates`

**Files:** `src/app/tracks/phantom/graduates/page.tsx`, `src/lib/tracks/graduates.ts`.

New query `getTrackGraduates(trackSlug, kind)`:
- SELECT users.username, badges.awardedAt
- JOIN badges ON badges.user_id = users.id AND badges.kind = kind
- JOIN tracks ON tracks.id = badges.ref_id AND tracks.slug = trackSlug
- ORDER BY badges.awardedAt ASC

Page is a public server component. Header "Phantom Operatives — Honor Roll". Table: Rank (by graduation order), @username (link to profile), graduation date (ISO).

Empty state: "No Phantom Operatives yet. Be the first."

Commit: `feat(phantom): graduates honor roll page`

---

## Task 8: Generic certificate route `/u/[username]/certificate/[track]`

**Files:** `src/app/u/[username]/certificate/[track]/page.tsx`, `src/components/certificate/PhantomCertificate.tsx`, `src/lib/certificate/queries.ts`.

### Query update

Rename / generalize existing `getGhostCertificate` to:

```ts
export async function getTrackCertificate(
  username: string,
  trackSlug: string,
): Promise<GhostCertificate | null>
```

Map `trackSlug` → badge kind:
- `ghost` → `ghost_graduate`
- `phantom` → `phantom_master`
- throws / returns null for unknown

Rename type to `TrackCertificate`. Update `getGhostCertificate` to be a thin wrapper calling `getTrackCertificate(username, "ghost")` so existing `/u/[username]/certificate/page.tsx` (ghost-specific) keeps working **without breaking anything**.

### Serial scheme

Update `operativeSerial` to accept a track-specific prefix:
- Ghost: `GHST-XXXX-XXXX-XXXX`
- Phantom: `PHNM-XXXX-XXXX-XXXX`

Signature: `operativeSerial(userId, trackId, awardedAt, prefix: string = "GHST")`.
Ghost cert component passes no prefix (backwards compat); new Phantom component passes `"PHNM"`.

### PhantomCertificate component

Distinct from `OperativeCertificate` (Ghost) — crimson palette, different ASCII header ("PHANTOM OPERATIVE"), different skills list (7 entries: sudo abuse / capabilities / container escape / runc CVE chain / Kubernetes pod escape / kubectl-free cluster pivot / IMDS handoff), different quote from SYNTHESIS.md. Same structural frame (operative name, serial, seal, grid, signature, verification footer).

### Route

`src/app/u/[username]/certificate/[track]/page.tsx`:
- `params: Promise<{ username: string; track: string }>`
- Validate track slug is "ghost" or "phantom"; else 404
- Call `getTrackCertificate(username, track)` → notFound() if null
- Render `<OperativeCertificate>` for ghost or `<PhantomCertificate>` for phantom
- generateMetadata with track-aware title

Existing ghost route `/u/[username]/certificate/page.tsx` stays — it's the shorter URL for ghost. Add a second server component at `/u/[username]/certificate/[track]/page.tsx` for the generic form.

Profile page (`/u/[username]/page.tsx`): if `phantom_master` badge present → show a second "★ View Phantom Operative Certificate" button (crimson styling) alongside the existing Ghost one.

Commit: `feat(certificate): generic track-parameterized certificate + PhantomCertificate variant`

---

## Task 9: Nav + home page Phantom → LIVE

**Files:** `src/components/TracksNav.tsx`, `src/app/page.tsx`.

- `TracksNav.tsx`: flip `phantom: SOON` → `phantom: LIVE`.
- `src/app/page.tsx`: update Phantom description line: remove "(soon)", rewrite as hardcore framing (one sentence mirroring Ghost line style).

Tiny commit. One-liner diffs in two files.

Commit: `feat(phantom): flip to LIVE in tracks nav + home`

---

## Task 10: E2E `phantom-master.spec.ts`

**Files:** `tests/e2e/phantom-master.spec.ts`.

Mirror `tests/e2e/ghost-graduate.spec.ts`:

1. **beforeAll**: TRUNCATE all tables, execSync `npm run seed:phantom`, also reseed ghost (phantom tests should leave ghost untouched for other tests — actually since each spec gets its own truncate+seed, phantom beforeAll handles phantom only).
2. **Main test**:
   - Register user
   - Fetch track id + 19 public phantom levels via SQL
   - Bulk INSERT submissions for idx 0..18 (19 public) and idx 19 (G19 kubelet, also public) — wait, the spec says 19 public (0-18) + G19 public (idx 19) + hidden (idx 20). So public count is 20 levels (0-19). Let me recount.
   - **Correction**: idx 0-19 are the 20 public levels, idx 20 is hidden. Total 21 rows, 20 non-hidden + 1 hidden. My earlier level count said "20 levels (19 public + 1 hidden)" — that's wrong, it should be 20 levels (19 public + 1 hidden) OR 21 levels (20 public + 1 hidden). Re-read the level list: tiers total 5 + 8 + 6 + 2 = 21 levels counting both G19 and G20. Hidden is G20. So public = 20, hidden = 1, total = 21. The correct frame is **21 levels (20 public + 1 hidden)**. **This is a correction to the earlier synthesis — cascade to content, seed, tests.**
3. **Bulk insert idx 0..19**, then goto `/tracks/phantom/20` → 200.
4. Read latest `phantom_l20 = FLAG{...}` from `.seed-flags.phantom.local.txt` using the `matchAll` + last-match pattern (same fix as ghost-graduate spec).
5. Submit via `/submit` → expect "Captured phantom level 20".
6. Verify `phantom_master` badge row in DB.
7. Visit `/u/<user>` → expect "Phantom Operative" pill.
8. Visit `/u/<user>/certificate/phantom` → expect PhantomCertificate visible, `PHNM-XXXX-XXXX-XXXX` serial visible, `OPERATIVE CERTIFICATION` text visible.
9. Visit `/tracks/phantom/graduates` → expect user's name in honor roll.
10. **Second test**: `/tracks/phantom/20` → 404 for a fresh non-graduate user.

Commit: `test(phantom): e2e graduation + certificate + honor roll flow`

---

## Task 11: Final sanity + tag

- **Cascade the 20→21 level count correction**: content file, seed script, invariant test, track page display strings. Triple-check.
- `npm test` — unit suite passes (+~5 new phantom tests).
- `DATABASE_URL=... npm run test:e2e` — full e2e suite passes (+2 new phantom tests).
- `npx tsc --noEmit` — clean.
- Merge `feature/phantom-v1-max` → `main` via `git merge --ff-only`.
- Tag `v0.9.0-phantom`.
- Push main + tag.
- Re-seed both ghost and phantom so local dev env mirrors production.
- Update Obsidian `Projects/BreachLab.md` changelog.

Commit: `chore: prep for v0.9.0-phantom tag`

---

## Level count correction (important)

The level list has:
- Recruit: 5 (R0-R4)
- Operator: 8 (O5-O12)
- Phantom: 6 (P13-P18)
- Graduate: 2 (G19 public kubelet, G20 hidden chained graduation)

**Total = 21 levels = 20 public + 1 hidden.**

All references to "20 levels" in this plan should read "21 levels (20 public + 1 hidden)". Hidden level idx = 20. Task 10 e2e bulk-inserts idx 0..19 (20 public), then submits idx 20.

---

## Spec coverage

- All 13 P0 techniques from research #4: covered (some consolidated — L7 cap_dac_read_search teaches shadow + id_rsa + kubeconfig combined)
- P1: CVE-2023-22809 sudoedit ✅ | Docker group ✅ | K8s Bad Pods ✅ | Kubelet :10250 ✅ | etcd direct read ✅ (folded into hidden L20 chain) | SSH key harvest ✅ (folded into L7) | AWS IMDS ✅ (epilogue of L20)
- P2: PwnKit CVE-2021-4034 ✅
- Pedagogical: 4 visible tiers (PortSwigger model), PortSwigger goal template strictly enforced by invariant test, progressive Approach hint on Operator tier only, mitigation version stamps
- Architecture: SSH-only endpoint displayed on track page (infra provisioning separate), honor roll instead of speedrun leaderboard

## Notes for executor

- **Zero migrations.** If you find yourself reaching for the schema, stop and reconsider — the plan is explicit that tier + approach + mitigation live in content file, not DB.
- **Content quality is the main value.** Each of the 21 level goals must follow the strict 2-4 sentence PortSwigger template. The invariant test will catch violations, but writing them right the first time matters — these are the product.
- **Generic certificate refactor is additive.** Existing `/u/[username]/certificate/page.tsx` must keep working after the change. Ghost e2e test must still pass without modification.
- **Each level strictly harder than previous same-category.** Within Operator tier: L5 (PwnKit, read a fix) < L6 (cap_setuid, one line python) < L7 (cap_dac_read_search, creative exfil) < L8 (cap_sys_ptrace, process injection). Respect this order — it's the pwn.college ladder-of-one rule.
- **No kernel exploits.** DirtyPipe, nf_tables, StackRot are explicitly Kernel Wraith territory. Do not sneak them in even if they "fit".
- **Approach hints are category-only, never commands.** Example good: "Look at what the sudo -l output reveals about preserved environment variables. You will need to produce and load a small binary artifact of your own — shell tricks won't work." Example bad: "Use LD_PRELOAD with a .so that has a constructor."
