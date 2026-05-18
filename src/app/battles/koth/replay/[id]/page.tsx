import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getReplayById, getSiblingReplays } from "@/lib/koth/replays";
import { ReplayPlayer } from "@/components/koth/ReplayPlayer";
import { ReplayCard } from "@/components/koth/ReplayCard";
import { CopyLinkButton } from "@/components/koth/CopyLinkButton";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const replay = await getReplayById(id);
  if (!replay) {
    return { title: "Replay not found — BreachLab" };
  }
  const who = replay.username ?? replay.actorSlot;
  const what =
    replay.kind === "crown_moment"
      ? `Crown moment — ${who}${replay.exploitPath ? " via " + replay.exploitPath : ""}`
      : `KoTH session — ${who}`;
  return {
    title: `${what} — BreachLab`,
    description:
      "A Crown Wars terminal recording. Watch the kill chain step by step.",
  };
}

// Page-level dynamic — replays are immutable once uploaded but we
// fetch sibling list every load so any new sessions in the same round
// show up live.
export const dynamic = "force-dynamic";

function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KiB`;
  return `${(b / 1024 / 1024).toFixed(1)} MiB`;
}

export default async function ReplayDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const replay = await getReplayById(id);
  if (!replay) notFound();

  const siblings = await getSiblingReplays(replay);

  const who = replay.username ?? replay.actorSlot;
  const isCrown = replay.kind === "crown_moment";
  const titleColor = isCrown ? "text-amber" : "text-text";
  const playerTitle = isCrown
    ? `${who} — crown moment${replay.exploitPath ? " via " + replay.exploitPath : ""}`
    : `${who} — ${replay.kind.replace("_", " ")}`;

  return (
    <article className="space-y-6 max-w-5xl">
      <header className="space-y-2">
        <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono flex items-center gap-3">
          <Link
            href="/battles/koth/replays"
            className="hover:text-amber transition-colors"
          >
            ← back to archive
          </Link>
          <span className="text-muted/40">|</span>
          <Link
            href={`/battles/koth/replays?slot=${replay.actorSlot}`}
            className="hover:text-amber transition-colors"
          >
            slot {replay.actorSlot}
          </Link>
        </div>
        <h1
          className={`${titleColor} text-2xl sm:text-3xl phosphor wordmark font-bold tracking-[0.04em] break-words`}
        >
          {isCrown ? "👑 " : "▸ "}
          {who}
          {replay.exploitPath && (
            <>
              {" "}
              <span className="text-amber/70 text-xl">/</span>{" "}
              <code className="text-amber text-xl">
                {replay.exploitPath}
              </code>
            </>
          )}
        </h1>
      </header>

      {/* Player — featured artifact, large and confident */}
      <section className="border border-amber/30 bg-bg shadow-[0_0_40px_-12px_rgba(252,184,20,0.18)]">
        <ReplayPlayer
          cast={replay.asciicast}
          title={playerTitle}
          idleTimeLimit={1}
        />
      </section>

      {/* Metadata strip — telemetry below the player like a flight log */}
      <section className="border border-border/40 p-3 font-mono text-[12px]">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
          <Meta label="kind" value={replay.kind.replace("_", " ")} />
          <Meta label="slot" value={replay.actorSlot} />
          <Meta
            label="recorded"
            value={replay.recordedAt.toISOString().replace("T", " ").slice(0, 19)}
          />
          <Meta label="duration" value={formatDuration(replay.durationSec)} />
          <Meta label="size" value={formatBytes(replay.byteSize)} />
          <Meta
            label="round"
            value={
              <Link
                href={`/battles/koth/history#round-${replay.roundId.slice(0, 8)}`}
                className="text-amber/80 hover:text-amber"
              >
                {replay.roundId.slice(0, 8)}…
              </Link>
            }
          />
          {replay.exploitPath && (
            <Meta
              label="path"
              value={
                <Link
                  href={`/battles/koth/replays?path=${replay.exploitPath}`}
                  className="text-amber/80 hover:text-amber"
                >
                  {replay.exploitPath}
                </Link>
              }
            />
          )}
          <Meta
            label="sha256"
            value={
              <code
                className="text-muted text-[10px]"
                title={replay.sha256}
              >
                {replay.sha256.slice(0, 8)}…
              </code>
            }
          />
        </div>
      </section>

      {/* Splitscreen siblings — same round, ±5min window. Surfaces the
          "what was everyone else doing" angle without bloating the
          page. Caps at 9 so the grid never overflows. */}
      {siblings.length > 0 && (
        <section className="space-y-3">
          <div className="text-[10px] text-amber/80 tracking-[0.3em] uppercase font-mono">
            ▸ contemporaneous sessions
          </div>
          <p className="text-[12px] text-muted">
            Recorded in the same round, within 5 min on either side. Click
            any to switch focus.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {siblings.map((sib) => (
              <ReplayCard key={sib.id} replay={sib} compact />
            ))}
          </div>
        </section>
      )}

      {/* Share + race CTAs */}
      <section className="border-t border-border/40 pt-4 flex flex-wrap items-center gap-3 text-[12px] font-mono">
        <Link
          href={`/battles/koth/race/${replay.id}`}
          className="border border-amber bg-amber/10 text-amber hover:bg-amber/20 px-3 py-1 transition-colors uppercase tracking-wider font-semibold"
        >
          ▸ race this ghost
        </Link>
        <CopyLinkButton path={`/battles/koth/replay/${replay.id}`} />
        <Link
          href={`/api/koth/replay/${replay.id}/raw`}
          className="border border-border/40 text-muted hover:border-amber/40 hover:text-text px-2 py-1 transition-colors"
        >
          ▸ download .cast
        </Link>
      </section>
    </article>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] text-muted uppercase tracking-wider">
        {label}
      </div>
      <div className="text-text">{value}</div>
    </div>
  );
}
