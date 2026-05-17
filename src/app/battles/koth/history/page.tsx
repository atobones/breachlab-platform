import Link from "next/link";
import { desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { kothRounds, kothEvents, users } from "@/lib/db/schema";
import { topNForRound } from "@/lib/koth/scoring";

export const metadata = {
  title: "Crown Wars · History — BreachLab",
};

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 20;

function fmtDur(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  return `${m}m`;
}

function fmtStandby(seconds: number): string {
  const s = Math.max(0, seconds);
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}m`;
}

async function loadHistory() {
  // Past closed/reset rounds — newest first, exclude still-active.
  const rounds = await db
    .select({
      id: kothRounds.id,
      startedAt: kothRounds.startedAt,
      engagedAt: kothRounds.engagedAt,
      endedAt: kothRounds.endedAt,
      status: kothRounds.status,
      resetReason: kothRounds.resetReason,
    })
    .from(kothRounds)
    .where(ne(kothRounds.status, "active"))
    .orderBy(desc(kothRounds.startedAt))
    .limit(HISTORY_LIMIT);

  // For each round, fetch top-3 + total events count.
  const summaries = await Promise.all(
    rounds.map(async (r) => {
      const top3 = await topNForRound(r.id, 3);
      const [lastEv] = await db
        .select({ kind: kothEvents.kind, username: users.username })
        .from(kothEvents)
        .leftJoin(users, eq(users.id, kothEvents.actorUserId))
        .where(eq(kothEvents.roundId, r.id))
        .orderBy(desc(kothEvents.occurredAt))
        .limit(1);

      // Active window = ended_at - engaged_at, NOT ended_at - started_at.
      // Rounds sit in standing-by (no clock) until the first crown_taken
      // sets engaged_at — that's the engaged-on-first-crown model. A
      // round that sat empty for 8 hours and then ran 30 minutes once
      // someone engaged should report 30m, not 8h30m.
      const activeWindowSec =
        r.endedAt && r.engagedAt
          ? Math.floor((r.endedAt.getTime() - r.engagedAt.getTime()) / 1000)
          : 0;
      const standbySec =
        r.engagedAt && r.startedAt
          ? Math.floor((r.engagedAt.getTime() - r.startedAt.getTime()) / 1000)
          : null;

      return {
        ...r,
        top3,
        lastEv,
        activeWindowSec,
        standbySec,
      };
    }),
  );

  return summaries;
}

export default async function KothHistoryPage() {
  const rounds = await loadHistory();

  return (
    <article className="space-y-5 max-w-3xl" data-testid="koth-history">
      {/* Hero */}
      <header className="space-y-2">
        <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono">
          ▸ predator arena · history
        </div>
        <h1 className="text-amber text-2xl sm:text-3xl phosphor wordmark font-bold tracking-[0.08em]">
          PAST ROUNDS
        </h1>
        <p className="text-[12px] text-muted leading-snug max-w-2xl">
          Last {HISTORY_LIMIT} closed rounds. The 30-minute clock starts
          when the first crown is grabbed — the time shown is the active
          window, not wall-clock. If the arena sat in standing-by before
          someone engaged, that wait is shown separately as{" "}
          <span className="text-muted/60">standby</span>.
        </p>
      </header>

      {rounds.length === 0 ? (
        <section className="border border-border/60 px-4 py-6 text-center">
          <p className="text-[13px] text-muted">
            no closed rounds yet — the first wave hasn&apos;t finished a
            cycle.
          </p>
        </section>
      ) : (
        <section className="space-y-3">
          {rounds.map((r) => (
            <article
              key={r.id}
              className="border border-border/60 px-4 py-3 space-y-2"
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap text-[11px] font-mono">
                <div className="flex items-center gap-2 tabular-nums flex-wrap">
                  <span className="text-amber">
                    {(r.engagedAt ?? r.startedAt)
                      .toISOString()
                      .slice(0, 16)
                      .replace("T", " ")}{" "}
                    UTC
                  </span>
                  <span className="text-muted">·</span>
                  {r.engagedAt ? (
                    <span className="text-text">{fmtDur(r.activeWindowSec)}</span>
                  ) : (
                    <span
                      className="text-muted/70"
                      title="round never engaged — no one took the crown"
                    >
                      no engagement
                    </span>
                  )}
                  {r.standbySec !== null && r.standbySec > 60 && (
                    <>
                      <span className="text-muted">·</span>
                      <span
                        className="text-muted/60 text-[10px]"
                        title="time the arena sat in standing-by before the first crown grab"
                      >
                        {fmtStandby(r.standbySec)} standby
                      </span>
                    </>
                  )}
                  <span className="text-muted">·</span>
                  <span
                    className={
                      r.status === "completed"
                        ? "text-green"
                        : r.status === "reset"
                        ? "text-amber/70"
                        : "text-muted"
                    }
                  >
                    {r.status}
                  </span>
                </div>
                <span className="text-[10px] text-muted/60 tabular-nums">
                  {r.id.slice(0, 8)}…
                </span>
              </div>

              {r.top3.length === 0 ? (
                <p className="text-[12px] text-muted font-mono">
                  no scoring · round had no attributed events
                </p>
              ) : (
                <ol className="text-[12px] font-mono tabular-nums space-y-0.5">
                  {r.top3.map((row, i) => (
                    <li key={row.userId} className="flex items-center gap-3">
                      <span className="text-amber w-4">{i + 1}.</span>
                      <span className="text-text flex-1 truncate flex items-baseline gap-1.5">
                        {row.username}
                        {i === 0 && (
                          <span
                            className="text-[9px] text-amber tracking-wider"
                            title="round winner"
                          >
                            ◆ winner
                          </span>
                        )}
                      </span>
                      <span className="text-amber w-12 text-right">
                        {row.points} pt
                      </span>
                      <span className="text-muted w-20 text-right text-[10px]">
                        {row.dethrones}d / {row.crownDurationSeconds}s
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          ))}
        </section>
      )}

      <footer className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted font-mono">
        <Link
          href="/battles/koth"
          className="hover:text-amber tracking-[0.18em] uppercase"
        >
          ← arena
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/battles/koth/champions"
            className="hover:text-amber tracking-[0.18em] uppercase"
          >
            champions
          </Link>
          <Link
            href="/battles/koth/rules"
            className="hover:text-amber tracking-[0.18em] uppercase"
          >
            rules →
          </Link>
        </div>
      </footer>
    </article>
  );
}
