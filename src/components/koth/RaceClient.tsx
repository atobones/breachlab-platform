"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ReplayPlayer } from "@/components/koth/ReplayPlayer";
import {
  finishRaceAction,
  startRaceAction,
} from "@/app/battles/koth/race/[replayId]/actions";

type Props = {
  replayId: string;
  replayCast: string;
  ghostDurationSec: number;
  ghostActorName: string;
  ghostExploitPath: string | null;
  // Server-rendered snapshot of the viewer's current race attempt for
  // this replay, if any. Drives initial phase so the client boots
  // straight into "racing" / "finished" without a fetch.
  initialAttempt: RaceAttemptSnapshot | null;
};

export type RaceAttemptSnapshot = {
  id: string;
  startedAt: string;       // ISO
  finishedAt: string | null;
  elapsedSec: number | null;
  tookCrown: boolean;
  selfReported: boolean;
  linkedEventId: number | null;
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
// All mutations go through server actions (PR #312 pattern): Cloudflare
// 403s anonymous /api/koth/* POSTs with a bot-challenge interstitial.
// Server actions POST to /_next/action/... with referer + a Next-
// generated token that CF accepts.
//
// The server-rendered page hands us a snapshot of any in-flight or
// finished attempt for the viewer; we boot phase from it. While
// racing we router.refresh() every 6s so the page re-renders and
// picks up a server-side crown_taken verification if one landed.

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
  initialAttempt,
}: Props) {
  const initialPhase: Phase =
    initialAttempt == null
      ? "ready"
      : initialAttempt.finishedAt != null
        ? "finished"
        : "racing";
  const initialStartMs = initialAttempt
    ? new Date(initialAttempt.startedAt).getTime()
    : null;
  const initialResult: FinishResult | null =
    initialAttempt && initialAttempt.finishedAt
      ? {
          elapsedSec: initialAttempt.elapsedSec ?? 0,
          tookCrown: initialAttempt.tookCrown,
          selfReported: initialAttempt.selfReported,
          linkedEventId: initialAttempt.linkedEventId,
        }
      : null;

  const [phase] = useState<Phase>(initialPhase);
  const attemptId = initialAttempt?.id ?? null;
  const startedAt = initialStartMs;
  const [elapsedMs, setElapsedMs] = useState(
    initialStartMs ? Date.now() - initialStartMs : 0,
  );
  const result = initialResult;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Cosmetic ticker — drives the elapsed display while racing.
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

  // Auto-poll while racing — the server can verify the attempt via
  // koth_events on the next render, so refreshing surfaces a verified
  // finish without the player clicking "I crowned".
  useEffect(() => {
    if (phase !== "racing") return undefined;
    const t = setInterval(() => router.refresh(), 6_000);
    return () => clearInterval(t);
  }, [phase, router]);

  const elapsedSec = elapsedMs / 1000;
  const liveOrFinalSec =
    phase === "finished" && result ? result.elapsedSec : elapsedSec;
  const ghostDelta =
    ghostDurationSec > 0 ? liveOrFinalSec - ghostDurationSec : 0;

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

      {/* Ghost player — auto-plays during the race. Constrained to
          max-w-3xl + mx-auto so it doesn't blast across the full page
          on wide monitors; matches the single-replay viewer. */}
      <section className="border border-amber/30 bg-bg max-w-3xl mx-auto w-full">
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
            <form action={startRaceAction}>
              <input type="hidden" name="replayId" value={replayId} />
              <button
                type="submit"
                className="border border-amber bg-amber/10 text-amber px-4 py-2 hover:bg-amber/20 transition-colors uppercase tracking-wider font-semibold"
              >
                ▸ start race
              </button>
            </form>
            <div className="text-muted text-[12px]">
              SSH into the arena in another tab — your timer starts the
              moment you press this button.
            </div>
          </>
        )}
        {phase === "racing" && (
          <>
            <form action={finishRaceAction}>
              <input type="hidden" name="attemptId" value={attemptId ?? ""} />
              <input type="hidden" name="replayId" value={replayId} />
              <input type="hidden" name="tookCrown" value="true" />
              <button
                type="submit"
                className="border border-green bg-green/10 text-green px-4 py-2 hover:bg-green/20 transition-colors uppercase tracking-wider font-semibold"
              >
                ✓ I crowned
              </button>
            </form>
            <form action={finishRaceAction}>
              <input type="hidden" name="attemptId" value={attemptId ?? ""} />
              <input type="hidden" name="replayId" value={replayId} />
              <input type="hidden" name="tookCrown" value="false" />
              <button
                type="submit"
                className="border border-border/40 text-muted px-3 py-2 hover:border-amber/40 hover:text-text transition-colors uppercase tracking-wider text-[12px]"
              >
                × give up
              </button>
            </form>
            <div className="text-amber/70 text-[11px] ml-auto animate-pulse">
              ● recording your run · auto-verifies via crown_taken
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
      </section>
    </div>
  );
}
