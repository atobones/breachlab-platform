import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  kothRounds,
  kothEvents,
  kothSshKeys,
  users,
} from "@/lib/db/schema";
import { topNForRound } from "@/lib/koth/scoring";
import {
  forceCloseActiveRound,
  adminOpenRound,
  revokeSlot,
  resetTutorial,
} from "./actions";

export const metadata = {
  title: "Admin · KoTH — BreachLab",
};

export const dynamic = "force-dynamic";

const RECENT_EVENTS = 30;
const RECENT_ROUNDS = 10;

async function loadAdminState() {
  const [activeRound] = await db
    .select()
    .from(kothRounds)
    .where(eq(kothRounds.status, "active"))
    .orderBy(desc(kothRounds.startedAt))
    .limit(1);

  const recentRounds = await db
    .select()
    .from(kothRounds)
    .orderBy(desc(kothRounds.startedAt))
    .limit(RECENT_ROUNDS);

  const recentEvents = await db
    .select({
      id: kothEvents.id,
      roundId: kothEvents.roundId,
      kind: kothEvents.kind,
      exploitPath: kothEvents.exploitPath,
      actorUsername: users.username,
      occurredAt: kothEvents.occurredAt,
      rawMeta: kothEvents.rawMeta,
    })
    .from(kothEvents)
    .leftJoin(users, eq(users.id, kothEvents.actorUserId))
    .orderBy(desc(kothEvents.occurredAt))
    .limit(RECENT_EVENTS);

  const keys = await db
    .select({
      userId: kothSshKeys.userId,
      slot: kothSshKeys.slot,
      fingerprint: kothSshKeys.fingerprint,
      tutorialCompletedAt: kothSshKeys.tutorialCompletedAt,
      addedAt: kothSshKeys.addedAt,
      lastUsedAt: kothSshKeys.lastUsedAt,
      username: users.username,
    })
    .from(kothSshKeys)
    .innerJoin(users, eq(users.id, kothSshKeys.userId))
    .orderBy(kothSshKeys.slot);

  const activeTop5 = activeRound
    ? await topNForRound(activeRound.id, 5)
    : [];

  return { activeRound, recentRounds, recentEvents, keys, activeTop5 };
}

export default async function AdminKothPage() {
  const state = await loadAdminState();

  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-amber text-lg font-mono tracking-[0.18em] uppercase">
          ▸ Crown Wars · admin
        </h2>
        <p className="text-[12px] text-muted">
          Active round, recent events, registered slots. Force-reset
          available for stuck states.
        </p>
      </header>

      {/* Active round */}
      <section className="border border-amber/30 bg-amber/[0.02] px-4 py-3 space-y-2">
        <h3 className="text-amber text-sm font-mono tracking-[0.18em] uppercase">
          ▸ Active Round
        </h3>
        {!state.activeRound ? (
          <div className="text-[13px] text-muted font-mono space-y-2">
            <p>No active round.</p>
            <form action={adminOpenRound}>
              <button
                type="submit"
                className="btn-bracket text-amber text-[12px] font-mono"
              >
                Open New Round
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="text-[12px] font-mono space-y-1 tabular-nums">
              <div>
                <span className="text-muted">id:</span>{" "}
                <span className="text-text">{state.activeRound.id}</span>
              </div>
              <div>
                <span className="text-muted">started:</span>{" "}
                <span className="text-text">
                  {state.activeRound.startedAt.toISOString()}
                </span>
              </div>
              <div>
                <span className="text-muted">container:</span>{" "}
                <span className="text-text">
                  {state.activeRound.containerId ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-muted">top-5:</span>{" "}
                {state.activeTop5.length === 0 ? (
                  <span className="text-text">no scoring yet</span>
                ) : (
                  <span className="text-text">
                    {state.activeTop5
                      .map(
                        (r) => `${r.username} (${r.points})`,
                      )
                      .join(" · ")}
                  </span>
                )}
              </div>
            </div>
            <form action={forceCloseActiveRound} className="pt-1">
              <button
                type="submit"
                className="btn-bracket text-red-400 text-[11px] font-mono"
              >
                Force-close · open new
              </button>
              <span className="text-[10px] text-muted ml-2">
                marks round as &apos;reset&apos;, DOES NOT recreate the
                arena container (that&apos;s a host job)
              </span>
            </form>
          </>
        )}
      </section>

      {/* Recent rounds */}
      <section className="border border-border/60 px-4 py-3 space-y-2">
        <h3 className="text-amber text-sm font-mono tracking-[0.18em] uppercase">
          ▸ Recent Rounds ({RECENT_ROUNDS})
        </h3>
        <table className="text-[11px] font-mono w-full tabular-nums">
          <thead>
            <tr className="text-muted border-b border-border/40">
              <th className="text-left py-1">started</th>
              <th className="text-left py-1">status</th>
              <th className="text-left py-1">ended</th>
              <th className="text-left py-1">reason</th>
            </tr>
          </thead>
          <tbody>
            {state.recentRounds.map((r) => (
              <tr key={r.id} className="border-b border-border/30">
                <td className="py-1 text-text">
                  {r.startedAt.toISOString().slice(0, 19).replace("T", " ")}
                </td>
                <td
                  className={`py-1 ${
                    r.status === "active"
                      ? "text-green"
                      : r.status === "completed"
                      ? "text-amber"
                      : "text-muted"
                  }`}
                >
                  {r.status}
                </td>
                <td className="py-1 text-text">
                  {r.endedAt
                    ? r.endedAt.toISOString().slice(11, 19)
                    : "—"}
                </td>
                <td className="py-1 text-muted">
                  {r.resetReason ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Recent events */}
      <section className="border border-border/60 px-4 py-3 space-y-2">
        <h3 className="text-amber text-sm font-mono tracking-[0.18em] uppercase">
          ▸ Recent Events ({RECENT_EVENTS})
        </h3>
        {state.recentEvents.length === 0 ? (
          <p className="text-[12px] text-muted font-mono">no events yet</p>
        ) : (
          <table className="text-[11px] font-mono w-full tabular-nums">
            <thead>
              <tr className="text-muted border-b border-border/40">
                <th className="text-left py-1">ts</th>
                <th className="text-left py-1">kind</th>
                <th className="text-left py-1">actor</th>
                <th className="text-left py-1">path</th>
                <th className="text-left py-1">round</th>
              </tr>
            </thead>
            <tbody>
              {state.recentEvents.map((ev) => (
                <tr key={ev.id} className="border-b border-border/30">
                  <td className="py-1 text-text">
                    {ev.occurredAt.toISOString().slice(11, 19)}
                  </td>
                  <td className="py-1 text-amber">{ev.kind}</td>
                  <td className="py-1 text-text">
                    {ev.actorUsername ?? (
                      <span className="text-muted">
                        unbound · {((ev.rawMeta as Record<string, unknown> | null)?.actor_slot as string | undefined) ?? "?"}
                      </span>
                    )}
                  </td>
                  <td className="py-1 text-muted">
                    {ev.exploitPath ?? "—"}
                  </td>
                  <td className="py-1 text-muted/60">
                    {ev.roundId.slice(0, 8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Slots / registered keys */}
      <section className="border border-border/60 px-4 py-3 space-y-2">
        <h3 className="text-amber text-sm font-mono tracking-[0.18em] uppercase">
          ▸ Registered Slots ({state.keys.length} / 5)
        </h3>
        {state.keys.length === 0 ? (
          <p className="text-[12px] text-muted font-mono">
            no enlisted operatives yet
          </p>
        ) : (
          <table className="text-[11px] font-mono w-full tabular-nums">
            <thead>
              <tr className="text-muted border-b border-border/40">
                <th className="text-left py-1">slot</th>
                <th className="text-left py-1">user</th>
                <th className="text-left py-1">fingerprint</th>
                <th className="text-left py-1">tutorial</th>
                <th className="text-left py-1">added</th>
                <th className="text-left py-1">actions</th>
              </tr>
            </thead>
            <tbody>
              {state.keys.map((k) => (
                <tr key={k.userId} className="border-b border-border/30">
                  <td className="py-1 text-amber">koth{k.slot}</td>
                  <td className="py-1 text-text">{k.username}</td>
                  <td className="py-1 text-muted/80">
                    {k.fingerprint.slice(0, 24)}…
                  </td>
                  <td className="py-1">
                    {k.tutorialCompletedAt ? (
                      <span className="text-amber">veteran</span>
                    ) : (
                      <span className="text-muted">rookie</span>
                    )}
                  </td>
                  <td className="py-1 text-muted">
                    {k.addedAt.toISOString().slice(0, 10)}
                  </td>
                  <td className="py-1 flex gap-2">
                    <form action={revokeSlot}>
                      <input type="hidden" name="userId" value={k.userId} />
                      <button
                        type="submit"
                        className="text-red-400 hover:underline text-[10px]"
                      >
                        revoke
                      </button>
                    </form>
                    {k.tutorialCompletedAt && (
                      <form action={resetTutorial}>
                        <input type="hidden" name="userId" value={k.userId} />
                        <button
                          type="submit"
                          className="text-amber/60 hover:underline text-[10px]"
                        >
                          reset-tut
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-[10px] text-muted leading-snug pt-1">
          Revoke clears the koth_ssh_keys row; the sync-keys cron picks
          this up within 60s and writes empty authorized_keys for that
          slot, locking SSH ingress. The user can re-enlist (will be
          assigned the next free slot).
        </p>
      </section>
    </article>
  );
}
