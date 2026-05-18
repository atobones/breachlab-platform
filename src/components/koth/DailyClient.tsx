"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  startDailyAction,
  finishDailyAction,
  abandonDailyAction,
} from "@/app/battles/koth/daily/actions";

type Phase = "ready" | "racing" | "finished";

type FinishResult = {
  elapsedSec: number;
  tookCrown: boolean;
  selfReported: boolean;
  linkedEventId: number | null;
};

// Snapshot of the user's attempt for today, passed in from the
// server-rendered page so the client knows which phase to boot into
// without a client-side API roundtrip (Cloudflare 403s those).
export type DailyAttemptSnapshot = {
  id: string;
  startedAt: string;       // ISO
  finishedAt: string | null;
  elapsedSec: number | null;
  tookCrown: boolean;
  selfReported: boolean;
  linkedEventId: number | null;
};

type Props = {
  day: string;            // "YYYY-MM-DD" UTC
  pathSlug: string;
  pathName: string | null;
  challengeNumber: number;
  initialAttempt: DailyAttemptSnapshot | null;
};

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Wordle-style spoiler-safe share string. Players post this to twitter
// /discord without leaking the solution. Tier emoji encodes the speed
// bucket — others see "you cleared today's challenge in <X>" without
// revealing the path slug or commands.
function shareString(
  day: string,
  challengeNumber: number,
  result: FinishResult,
): string {
  const sec = result.elapsedSec;
  let tier = "🥉";
  if (sec < 30) tier = "👑👑👑";
  else if (sec < 60) tier = "🏆🏆";
  else if (sec < 120) tier = "🏆";
  else if (sec < 300) tier = "✅";
  else tier = "🐌";
  const status = result.tookCrown ? tier : "❌ no-crown";
  return [
    `BreachLab Daily #${challengeNumber} — ${day}`,
    `${status} ${fmt(sec)}`,
    `breachlab.org/battles/koth/daily`,
  ].join("\n");
}

export function DailyClient({
  day,
  pathSlug,
  pathName,
  challengeNumber,
  initialAttempt,
}: Props) {
  // Boot phase from the server-rendered attempt snapshot. The "ready"
  // phase is for "no attempt logged yet today"; "racing" is for "we
  // have an unfinished attempt, the clock is ticking"; "finished" is
  // for "attempt is done, show result".
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
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkNotYet = searchParams?.get("check") === "not-yet";

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

  // Auto-poll while racing — the server checks for a matching
  // crown_taken event on every render, so refreshing the route every
  // 6s surfaces the verified finish without the player clicking
  // anything. Stops as soon as we leave racing.
  useEffect(() => {
    if (phase !== "racing") return undefined;
    const t = setInterval(() => {
      router.refresh();
    }, 6_000);
    return () => clearInterval(t);
  }, [phase, router]);

  async function copyShare() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(shareString(day, challengeNumber, result));
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 1600);
    } catch {
      // ignore
    }
  }

  const elapsedSec = elapsedMs / 1000;

  return (
    <div className="space-y-4 font-mono">
      {phase === "ready" && (
        <section className="border border-amber/30 bg-bg/40 p-4">
          <div className="text-[10px] text-amber/80 uppercase tracking-widest mb-2">
            ▸ today&apos;s primitive
          </div>
          <div className="text-amber text-xl mb-1">{pathName ?? pathSlug}</div>
          <code className="text-amber/70 text-[12px]">{pathSlug}</code>
          <p className="text-[13px] text-muted mt-3 leading-relaxed">
            Take crown via this primitive faster than anyone else today.
            All players worldwide get the same path — your time goes on a
            shared leaderboard. Resets at 00:00 UTC.
          </p>
          <form action={startDailyAction}>
            <button
              type="submit"
              className="mt-4 border border-amber bg-amber/10 text-amber px-4 py-2 hover:bg-amber/20 transition-colors uppercase tracking-wider font-semibold text-[13px]"
            >
              ▸ start today&apos;s run
            </button>
          </form>
        </section>
      )}

      {phase === "racing" && (
        <section className="space-y-3">
          <div className="border border-amber/30 bg-bg/40 p-4 flex items-center gap-4">
            <div>
              <div className="text-[10px] text-amber/80 uppercase tracking-widest">
                ▸ elapsed
              </div>
              <div className="text-amber text-3xl mt-1">{fmt(elapsedSec)}</div>
            </div>
            <div className="ml-auto flex flex-col items-end gap-2">
              <form action={finishDailyAction}>
                <input type="hidden" name="attemptId" value={attemptId ?? ""} />
                <button
                  type="submit"
                  className="border border-green bg-green/10 text-green px-3 py-1.5 hover:bg-green/20 transition-colors uppercase tracking-wider text-[12px] font-semibold"
                  title="Pings the oracle. Only counts if you actually crowned via today's primitive."
                >
                  ▸ check status
                </button>
              </form>
              <form action={abandonDailyAction}>
                <input type="hidden" name="attemptId" value={attemptId ?? ""} />
                <button
                  type="submit"
                  className="border border-border/40 text-muted px-3 py-1 hover:border-amber/40 hover:text-text transition-colors uppercase tracking-wider text-[11px]"
                >
                  × abandon
                </button>
              </form>
            </div>
          </div>
          {checkNotYet && (
            <p className="text-[12px] text-red-400">
              ⚠ not yet — no crown_taken with{" "}
              <code className="text-red-400/90">{pathSlug}</code> on your
              account since you pressed start. The page checks automatically
              every few seconds; this button is a manual poll.
            </p>
          )}
          <p className="text-[12px] text-muted leading-relaxed">
            SSH into Crown Wars in another tab and crown the king via{" "}
            <code className="text-amber/80">{pathSlug}</code>. The page auto-
            detects your crown via the oracle — no need to come back and
            click anything.
          </p>
        </section>
      )}

      {phase === "finished" && result && (
        <section className="space-y-3">
          <div
            className={`border ${
              result.tookCrown ? "border-green" : "border-muted"
            } p-4`}
          >
            <div
              className={`text-2xl ${
                result.tookCrown ? "text-green" : "text-muted"
              }`}
            >
              {result.tookCrown ? "🏆" : "×"} {fmt(result.elapsedSec)}
            </div>
            <div className="text-[12px] text-muted mt-1">
              {result.tookCrown
                ? "verified via crown_taken"
                : "abandoned — next reset at 00:00 UTC"}
            </div>
          </div>
          {result.tookCrown && (
            <div className="border border-border/40 p-3">
              <div className="text-[10px] text-amber/80 uppercase tracking-widest mb-2">
                ▸ share your time
              </div>
              <pre className="bg-bg/40 border border-border/30 p-2 text-[11px] text-text whitespace-pre overflow-x-auto">
{shareString(day, challengeNumber, result)}
              </pre>
              <button
                onClick={copyShare}
                className={`mt-2 border px-2 py-1 transition-colors text-[12px] uppercase tracking-wider ${
                  copyStatus === "copied"
                    ? "border-green text-green bg-green/10"
                    : "border-amber/40 text-amber hover:bg-amber/10"
                }`}
              >
                {copyStatus === "copied" ? "✓ copied" : "▸ copy share"}
              </button>
            </div>
          )}
        </section>
      )}

    </div>
  );
}
