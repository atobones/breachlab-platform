import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getReplayById } from "@/lib/koth/replays";
import {
  getInflightRaceAttemptForUser,
  getReplayLeaderboard,
  getReplayGhostDuration,
} from "@/lib/koth/races";
import { getCurrentSession } from "@/lib/auth/session";
import {
  RaceClient,
  type RaceAttemptSnapshot,
} from "@/components/koth/RaceClient";

type Params = Promise<{ replayId: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { replayId } = await params;
  const replay = await getReplayById(replayId);
  if (!replay) return { title: "Race not found — BreachLab" };
  const who = replay.username ?? replay.actorSlot;
  return {
    title: `Race ${who}'s ghost — BreachLab`,
    description:
      "Race against a Crown Wars ghost replay. Beat their time to land on the leaderboard.",
  };
}

export const dynamic = "force-dynamic";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function RacePage({ params }: { params: Params }) {
  const { replayId } = await params;

  const replay = await getReplayById(replayId);
  if (!replay) notFound();

  const [ghostDuration, leaderboard, session] = await Promise.all([
    getReplayGhostDuration(replayId),
    getReplayLeaderboard(replayId, 20),
    getCurrentSession(),
  ]);

  // Boot RaceClient straight into the correct phase by handing it
  // any in-flight attempt the viewer already has. CF blocks the
  // pre-server-actions /api fetch, so we can't discover this from
  // the client.
  const inflight = session.user
    ? await getInflightRaceAttemptForUser(session.user.id, replayId)
    : null;
  const initialAttempt: RaceAttemptSnapshot | null = inflight
    ? {
        id: inflight.id,
        startedAt: inflight.startedAt.toISOString(),
        finishedAt: inflight.finishedAt
          ? inflight.finishedAt.toISOString()
          : null,
        elapsedSec: inflight.elapsedSec,
        tookCrown: inflight.tookCrown,
        selfReported: inflight.selfReported,
        linkedEventId: inflight.linkedEventId,
      }
    : null;

  const who = replay.username ?? replay.actorSlot;

  return (
    <article className="space-y-6 max-w-5xl">
      <header className="space-y-2">
        <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono flex items-center gap-3">
          <Link
            href={`/battles/koth/replay/${replayId}`}
            className="hover:text-amber transition-colors"
          >
            ← back to replay
          </Link>
          <span className="text-muted/40">|</span>
          <Link
            href="/battles/koth/replays"
            className="hover:text-amber transition-colors"
          >
            archive
          </Link>
        </div>
        <h1 className="text-amber text-2xl sm:text-3xl phosphor wordmark font-bold tracking-[0.04em]">
          ▸ race the ghost
        </h1>
        <p className="text-[13px] text-muted max-w-3xl">
          racing <span className="text-text font-semibold">{who}</span>
          {replay.exploitPath ? (
            <>
              {" "}
              via <code className="text-amber/80">{replay.exploitPath}</code>
            </>
          ) : null}
        </p>
      </header>

      <RaceClient
        replayId={replay.id}
        replayCast={replay.asciicast}
        ghostDurationSec={ghostDuration}
        ghostActorName={who}
        ghostExploitPath={replay.exploitPath}
        initialAttempt={initialAttempt}
      />

      {/* Leaderboard */}
      <section className="border border-border/40">
        <div className="px-3 py-2 border-b border-border/40 bg-amber/[0.04]">
          <div className="text-[10px] text-amber/80 tracking-[0.3em] uppercase font-mono">
            ▸ leaderboard · {who}&apos;s ghost
          </div>
        </div>
        {leaderboard.length === 0 ? (
          <div className="p-6 text-center text-muted font-mono text-sm">
            No one has beaten this run yet. Be the first.
          </div>
        ) : (
          <ol className="divide-y divide-border/30 font-mono text-[13px]">
            {leaderboard.map((row, i) => {
              const delta = row.elapsedSec - ghostDuration;
              const beatGhost = delta < 0 && ghostDuration > 0;
              return (
                <li
                  key={row.id}
                  className="px-3 py-2 flex items-center gap-3"
                >
                  <span
                    className={`w-6 text-right font-bold ${
                      i === 0
                        ? "text-amber"
                        : i < 3
                          ? "text-text"
                          : "text-muted"
                    }`}
                  >
                    #{i + 1}
                  </span>
                  <span
                    className={beatGhost ? "text-green" : "text-text"}
                    title={beatGhost ? "beat the ghost" : ""}
                  >
                    {row.username ?? "anonymous"}
                  </span>
                  {row.selfReported && (
                    <span className="text-[10px] text-muted/60 italic">
                      self-reported
                    </span>
                  )}
                  <span className="ml-auto text-amber/80">
                    {fmt(row.elapsedSec)}
                  </span>
                  {ghostDuration > 0 && (
                    <span
                      className={`text-[11px] ${
                        beatGhost ? "text-green" : "text-muted"
                      }`}
                    >
                      {delta > 0 ? "+" : ""}
                      {fmt(Math.abs(delta))}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

    </article>
  );
}
