"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ReplayPlayer } from "@/components/koth/ReplayPlayer";

type Props = {
  replayId: string;
  replayCast: string;
  ghostDurationSec: number;
  ghostActorName: string;
  ghostExploitPath: string | null;
};

type Phase = "ready" | "racing" | "finished";

type FinishResult = {
  elapsedSec: number;
  tookCrown: boolean;
  selfReported: boolean;
  linkedEventId: number | null;
};

// RaceClient — owns the start/finish lifecycle of a Ghost-Race attempt.
//
// Flow:
//   ready    → big "Start Race" button + ghost player paused
//   racing   → timer ticks, ghost player auto-plays, "I crowned" + "give up"
//   finished → result summary + leaderboard reload hint
//
// The server is the authoritative clock — we POST started_at when the
// "Start Race" button is pressed, and POST finished on either resolution.
// The client-side timer is purely cosmetic (animates the elapsed display);
// the server-recorded value is what hits the leaderboard.

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RaceClient({
  replayId,
  replayCast,
  ghostDurationSec,
  ghostActorName,
  ghostExploitPath,
}: Props) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<FinishResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Cosmetic ticker — drives the elapsed display while racing
  useEffect(() => {
    if (phase === "racing" && startedAt != null) {
      intervalRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAt);
      }, 100);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
    return undefined;
  }, [phase, startedAt]);

  async function startRace() {
    setError(null);
    try {
      // X-Requested-With + same-origin credentials defuse the Cloudflare
      // bot-challenge that otherwise interstitials anonymous POSTs.
      const r = await fetch("/api/koth/race/start", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ replayId }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
      const data: { attemptId: string; startedAt: string; anonymous: boolean } =
        await r.json();
      setAttemptId(data.attemptId);
      setStartedAt(new Date(data.startedAt).getTime());
      setPhase("racing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "race start failed");
    }
  }

  async function finishRace(claimedCrown: boolean) {
    if (!attemptId) return;
    setError(null);
    try {
      const r = await fetch(`/api/koth/race/${attemptId}/finish`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ tookCrown: claimedCrown }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
      const data: FinishResult = await r.json();
      setResult(data);
      setPhase("finished");
      // Refresh the page so the leaderboard reflects the new attempt
      setTimeout(() => router.refresh(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "race finish failed");
    }
  }

  const elapsedSec = elapsedMs / 1000;
  const ghostDelta = ghostDurationSec > 0 ? elapsedSec - ghostDurationSec : 0;

  return (
    <div className="space-y-4">
      {/* Header strip — phase + timers + ghost info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[12px]">
        <div className="border border-amber/30 bg-bg/40 p-3">
          <div className="text-[10px] text-amber/80 uppercase tracking-widest">
            ▸ your time
          </div>
          <div
            className={`text-2xl mt-1 ${
              phase === "racing"
                ? "text-amber"
                : phase === "finished"
                  ? "text-green"
                  : "text-muted"
            }`}
          >
            {phase === "ready" && "—"}
            {phase === "racing" && fmt(elapsedSec)}
            {phase === "finished" && result && fmt(result.elapsedSec)}
          </div>
        </div>
        <div className="border border-border/40 bg-bg/40 p-3">
          <div className="text-[10px] text-muted uppercase tracking-widest">
            ▸ ghost
          </div>
          <div className="text-2xl mt-1 text-text">
            {ghostDurationSec > 0 ? fmt(ghostDurationSec) : "—"}
          </div>
          <div className="text-[10px] text-muted mt-1">
            {ghostActorName}
            {ghostExploitPath && (
              <>
                {" · "}
                <code className="text-amber/70">{ghostExploitPath}</code>
              </>
            )}
          </div>
        </div>
        <div className="border border-border/40 bg-bg/40 p-3">
          <div className="text-[10px] text-muted uppercase tracking-widest">
            ▸ delta
          </div>
          <div
            className={`text-2xl mt-1 ${
              phase === "ready"
                ? "text-muted"
                : ghostDelta < 0
                  ? "text-green"
                  : "text-amber"
            }`}
          >
            {phase === "ready" || ghostDurationSec === 0
              ? "—"
              : (ghostDelta > 0 ? "+" : "") + fmt(Math.abs(ghostDelta))}
          </div>
          <div className="text-[10px] text-muted mt-1">
            {phase === "ready" && "vs ghost — start to compare"}
            {phase === "racing" &&
              (ghostDelta < 0 ? "you're ahead" : "ghost is ahead")}
            {phase === "finished" &&
              result?.tookCrown &&
              (ghostDelta < 0 ? "🏆 beat the ghost" : "ghost wins")}
            {phase === "finished" && !result?.tookCrown && "did not crown"}
          </div>
        </div>
      </div>

      {/* Ghost player — pinned during the race */}
      <section className="border border-amber/30 bg-bg">
        <ReplayPlayer
          cast={replayCast}
          title={`Ghost: ${ghostActorName}${ghostExploitPath ? " · " + ghostExploitPath : ""}`}
          autoPlay={phase === "racing"}
          idleTimeLimit={1}
        />
      </section>

      {/* Action strip */}
      <section className="flex flex-wrap gap-3 items-center font-mono text-[13px]">
        {phase === "ready" && (
          <>
            <button
              onClick={startRace}
              className="border border-amber bg-amber/10 text-amber px-4 py-2 hover:bg-amber/20 transition-colors uppercase tracking-wider font-semibold"
            >
              ▸ start race
            </button>
            <div className="text-muted text-[12px]">
              SSH into the arena in another tab — your timer starts the
              moment you press this button.
            </div>
          </>
        )}
        {phase === "racing" && (
          <>
            <button
              onClick={() => finishRace(true)}
              className="border border-green bg-green/10 text-green px-4 py-2 hover:bg-green/20 transition-colors uppercase tracking-wider font-semibold"
            >
              ✓ I crowned
            </button>
            <button
              onClick={() => finishRace(false)}
              className="border border-border/40 text-muted px-3 py-2 hover:border-amber/40 hover:text-text transition-colors uppercase tracking-wider text-[12px]"
            >
              × give up
            </button>
            <div className="text-amber/70 text-[11px] ml-auto animate-pulse">
              ● recording your run
            </div>
          </>
        )}
        {phase === "finished" && result && (
          <div
            className={`border ${
              result.tookCrown ? "border-green text-green" : "border-muted text-muted"
            } p-3 w-full font-mono`}
          >
            <div className="text-[14px] mb-1">
              {result.tookCrown ? "🏆 race recorded" : "× no crown this run"}
            </div>
            <div className="text-[11px] opacity-80">
              your time: {fmt(result.elapsedSec)} · ghost: {fmt(ghostDurationSec)}{" "}
              {ghostDelta < 0 ? "(faster by " : "(slower by "}
              {fmt(Math.abs(ghostDelta))})
              {result.linkedEventId
                ? " · verified via crown_taken event"
                : result.selfReported
                  ? " · self-reported"
                  : ""}
            </div>
          </div>
        )}
        {error && (
          <div className="text-red text-[12px] w-full">⚠ {error}</div>
        )}
      </section>
    </div>
  );
}
