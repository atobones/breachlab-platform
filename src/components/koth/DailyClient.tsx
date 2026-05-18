"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Phase = "ready" | "racing" | "finished";

type FinishResult = {
  elapsedSec: number;
  tookCrown: boolean;
  selfReported: boolean;
  linkedEventId: number | null;
};

type Props = {
  day: string;            // "YYYY-MM-DD" UTC
  pathSlug: string;
  pathName: string | null;
  challengeNumber: number;
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
}: Props) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<FinishResult | null>(null);
  const [resumed, setResumed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

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

  async function startChallenge() {
    setError(null);
    try {
      // X-Requested-With + same-origin credentials make Cloudflare's
      // bot-challenge heuristic accept the request as a normal
      // browser fetch instead of a scripted attack. Without this,
      // anonymous POSTs to /api/koth/* return a CF interstitial 403.
      const r = await fetch("/api/koth/daily/start", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: "{}",
      });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        throw new Error(b.error ?? `HTTP ${r.status}`);
      }
      const data: {
        attemptId: string;
        startedAt: string;
        resumed: boolean;
        anonymous: boolean;
      } = await r.json();
      setAttemptId(data.attemptId);
      setStartedAt(new Date(data.startedAt).getTime());
      setResumed(data.resumed);
      setPhase("racing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "start failed");
    }
  }

  async function finish(claimedCrown: boolean) {
    if (!attemptId) return;
    setError(null);
    try {
      const r = await fetch(`/api/koth/daily/${attemptId}/finish`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ tookCrown: claimedCrown }),
      });
      if (!r.ok) {
        const b = await r.json().catch(() => ({}));
        throw new Error(b.error ?? `HTTP ${r.status}`);
      }
      const data: FinishResult = await r.json();
      setResult(data);
      setPhase("finished");
      setTimeout(() => router.refresh(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "finish failed");
    }
  }

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
          <button
            onClick={startChallenge}
            className="mt-4 border border-amber bg-amber/10 text-amber px-4 py-2 hover:bg-amber/20 transition-colors uppercase tracking-wider font-semibold text-[13px]"
          >
            ▸ start today&apos;s run
          </button>
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
              <button
                onClick={() => finish(true)}
                className="border border-green bg-green/10 text-green px-3 py-1.5 hover:bg-green/20 transition-colors uppercase tracking-wider text-[12px] font-semibold"
              >
                ✓ I crowned
              </button>
              <button
                onClick={() => finish(false)}
                className="border border-border/40 text-muted px-3 py-1 hover:border-amber/40 hover:text-text transition-colors uppercase tracking-wider text-[11px]"
              >
                × give up
              </button>
            </div>
          </div>
          {resumed && (
            <p className="text-[11px] text-amber/70 italic">
              ▸ resumed — timer continues from your earlier start today
            </p>
          )}
          <p className="text-[12px] text-muted">
            Target primitive: <code className="text-amber/80">{pathSlug}</code>.
            SSH into Crown Wars in another tab — your time runs from this
            click until you press <code>I crowned</code>.
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
                ? result.linkedEventId
                  ? "verified via crown_taken event"
                  : "self-reported"
                : "did not crown — next reset at 00:00 UTC"}
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

      {error && (
        <div className="text-red text-[12px]">⚠ {error}</div>
      )}
    </div>
  );
}
