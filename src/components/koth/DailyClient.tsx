"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  startDailyAction,
  finishDailyAction,
  abandonDailyAction,
} from "@/app/battles/koth/daily/actions";
import type { DailyTwist, DailyTwistMode } from "@/lib/koth/daily";

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
  // Daily Twist Phase 1 (#69). null = plain (no twist; show slug).
  twistMode: DailyTwistMode;
  twist: DailyTwist;
  // Best previous time on this primitive across all dailies — null
  // when the user has never crowned it before. Used to render the
  // "▸ your best: 0:42" chip on the ready screen (#73).
  personalBest: { elapsedSec: number; dayUtc: string } | null;
  // Asciinema replay recorded for this exact crown moment, if the
  // arena's uploader linked one to the attempt's crown_taken event.
  // Drives the "▸ watch your run" + "▸ race your past self" CTAs
  // on the finish screen (#76). null when no replay is available
  // (e.g., attempt not yet verified or uploader missed it).
  replayForFinish: { id: string; durationSec: number | null } | null;
};

// Tier-cutoff bands (#75) — shown on the ready screen so players
// know what they're shooting for before they start. Kept in sync
// with shareString's tier picker.
const TIER_BANDS = [
  { emoji: "👑", label: "<30s" },
  { emoji: "🏆", label: "<1m" },
  { emoji: "✅", label: "<2m" },
  { emoji: "🐢", label: "<5m" },
] as const;

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

// Human-readable label for an encoding scheme — shown on the twist
// card after the player hits "show hint" so they know what to undo.
function encodingHint(enc: string): string {
  switch (enc) {
    case "base64":
      return "base64-encoded — try `echo … | base64 -d` or any base64 decoder.";
    case "rot13":
      return "rot13 — letters shifted 13 positions through the alphabet.";
    case "reverse":
      return "the slug is reversed character-by-character.";
    case "hex":
      return "hex bytes — try `echo … | xxd -r -p` or any hex→ascii tool.";
    default:
      return "decode to reveal the primitive slug.";
  }
}

export function DailyClient({
  day,
  pathSlug,
  pathName,
  challengeNumber,
  initialAttempt,
  twistMode,
  twist,
  personalBest,
  replayForFinish,
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
  // Hint unlock (#74): on the ready screen + during a run, players
  // can reveal the real slug after the twist's reveal_after_sec
  // window. They can also pop it manually at the cost of being
  // marked "hinted" in their personal best (#73 tracks this).
  const [hintRevealed, setHintRevealed] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkNotYet = searchParams?.get("check") === "not-yet";

  // Reveal-window calc — counts from start-of-run for racing, from
  // page load for ready. After the timer expires, the "show real
  // slug" button becomes the headline action.
  const revealAfter =
    twist && "revealAfterSec" in twist && twist.revealAfterSec
      ? twist.revealAfterSec
      : null;
  const sinceStartSec =
    phase === "racing" ? Math.floor(elapsedMs / 1000) : 0;
  const autoHintReady =
    revealAfter != null && phase === "racing" && sinceStartSec >= revealAfter;

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
        <section className="space-y-3">
          <TwistCard
            twistMode={twistMode}
            twist={twist}
            pathSlug={pathSlug}
            pathName={pathName}
            hintRevealed={hintRevealed}
            onReveal={() => setHintRevealed(true)}
            showHintButton
          />
          <div className="border border-border/40 bg-bg/40 p-3 flex items-center gap-3 flex-wrap text-[11px] font-mono">
            <span className="text-amber/70 uppercase tracking-widest">
              ▸ tier cutoffs
            </span>
            {TIER_BANDS.map((b) => (
              <span key={b.label} className="text-muted">
                <span className="mr-1">{b.emoji}</span>
                {b.label}
              </span>
            ))}
          </div>
          {personalBest && (
            <div className="border border-green/30 bg-green/[0.04] p-3 flex items-center gap-3 text-[12px] font-mono">
              <span className="text-green/80 uppercase tracking-widest text-[10px]">
                ▸ your best on this primitive
              </span>
              <span className="text-green">{fmt(personalBest.elapsedSec)}</span>
              <span className="text-muted/70 text-[10px] ml-auto">
                set {personalBest.dayUtc}
              </span>
            </div>
          )}
          {!personalBest && (
            <p className="text-[11px] text-muted/80 font-mono italic">
              ▸ first time on this primitive — set a personal best to chase
              on its next rotation.
            </p>
          )}
          <form action={startDailyAction}>
            <button
              type="submit"
              className="border border-amber bg-amber/10 text-amber px-4 py-2 hover:bg-amber/20 transition-colors uppercase tracking-wider font-semibold text-[13px]"
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
          <TwistCard
            twistMode={twistMode}
            twist={twist}
            pathSlug={pathSlug}
            pathName={pathName}
            hintRevealed={hintRevealed || autoHintReady}
            onReveal={() => setHintRevealed(true)}
            showHintButton
            autoHintAt={revealAfter}
            autoHintRemainingSec={
              revealAfter != null
                ? Math.max(0, revealAfter - sinceStartSec)
                : null
            }
          />
          {checkNotYet && (
            <p className="text-[12px] text-red-400">
              ⚠ not yet — no crown via{" "}
              <code className="text-red-400/90">{pathSlug}</code> on your account since start.
            </p>
          )}
          <p className="text-[12px] text-muted">
            ▸ SSH into Crown Wars and crown via the primitive above — verifies automatically.
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
            {result.tookCrown && personalBest && (
              <div className="text-[11px] mt-2 font-mono">
                {result.elapsedSec < personalBest.elapsedSec ? (
                  <span className="text-green">
                    ▸ new personal best on this primitive · beat{" "}
                    {fmt(personalBest.elapsedSec)} by{" "}
                    {fmt(personalBest.elapsedSec - result.elapsedSec)}
                  </span>
                ) : result.elapsedSec === personalBest.elapsedSec ? (
                  <span className="text-amber/80">
                    ▸ matched your personal best ({fmt(personalBest.elapsedSec)})
                  </span>
                ) : (
                  <span className="text-muted">
                    ▸ off your best by{" "}
                    {fmt(result.elapsedSec - personalBest.elapsedSec)} (best:{" "}
                    {fmt(personalBest.elapsedSec)} on {personalBest.dayUtc})
                  </span>
                )}
              </div>
            )}
            {result.tookCrown && !personalBest && (
              <div className="text-[11px] mt-2 text-green/80 font-mono">
                ▸ first verified time on this primitive — that&apos;s your
                personal best from here on.
              </div>
            )}
          </div>
          {result.tookCrown && replayForFinish && (
            <div className="border border-amber/30 bg-amber/[0.04] p-3 space-y-2">
              <div className="text-[10px] text-amber/80 uppercase tracking-widest">
                ▸ your crown moment was recorded
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <a
                  href={`/battles/koth/replay/${replayForFinish.id}`}
                  className="border border-amber/60 text-amber hover:bg-amber/10 px-3 py-1.5 uppercase tracking-wider text-[12px] transition-colors"
                >
                  ▸ watch replay
                </a>
                <a
                  href={`/battles/koth/race/${replayForFinish.id}`}
                  className="border border-green/60 text-green hover:bg-green/10 px-3 py-1.5 uppercase tracking-wider text-[12px] transition-colors"
                >
                  ▸ race your past self
                </a>
                {replayForFinish.durationSec != null && (
                  <span className="text-muted text-[10px]">
                    ghost length: {fmt(replayForFinish.durationSec)}
                  </span>
                )}
              </div>
            </div>
          )}
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

// Renders today's puzzle — encoded slug, riddle, or plain. The card
// is the headline element on both the ready screen and during a run,
// so it carries the framing: "you have to figure out THIS, then
// crown via it".
function TwistCard({
  twistMode,
  twist,
  pathSlug,
  pathName,
  hintRevealed,
  onReveal,
  showHintButton,
  autoHintAt,
  autoHintRemainingSec,
}: {
  twistMode: DailyTwistMode;
  twist: DailyTwist;
  pathSlug: string;
  pathName: string | null;
  hintRevealed: boolean;
  onReveal: () => void;
  showHintButton?: boolean;
  autoHintAt?: number | null;
  autoHintRemainingSec?: number | null;
}) {
  const label =
    twistMode === "riddle"
      ? "▸ today's riddle"
      : twistMode === "encoded"
        ? "▸ today's puzzle"
        : "▸ today's primitive";

  return (
    <div className="border border-amber/30 bg-bg/40 p-4">
      <div className="text-[10px] text-amber/80 uppercase tracking-widest mb-2 flex items-center gap-2">
        <span>{label}</span>
        {twistMode === "encoded" && twist && twist.mode === "encoded" && (
          <span className="text-muted/70 text-[9px]">
            · encoding hidden
          </span>
        )}
      </div>

      {twistMode === "plain" && (
        <>
          <div className="text-amber text-xl mb-1">{pathName ?? pathSlug}</div>
          <code className="text-amber/70 text-[12px]">{pathSlug}</code>
        </>
      )}

      {twistMode === "encoded" && twist && twist.mode === "encoded" && (
        <>
          <div className="text-amber text-lg mb-1 break-all font-mono">
            {twist.displayed}
          </div>
          <div className="text-[11px] text-muted leading-relaxed">
            Decode this to learn which primitive crowns the king today.
          </div>
          {hintRevealed && (
            <div className="mt-3 border-l-2 border-green/50 pl-3 space-y-1">
              <div className="text-[11px] text-green/80">
                {encodingHint(twist.encoding)}
              </div>
              <div className="text-amber text-[13px]">
                ▸ {pathName ?? pathSlug}{" "}
                <code className="text-amber/70 text-[11px] ml-1">
                  ({pathSlug})
                </code>
              </div>
            </div>
          )}
        </>
      )}

      {twistMode === "riddle" && twist && twist.mode === "riddle" && (
        <>
          <p className="text-amber text-[15px] italic leading-relaxed">
            {twist.riddle}
          </p>
          {hintRevealed && (
            <div className="mt-3 border-l-2 border-green/50 pl-3">
              <div className="text-amber text-[13px]">
                ▸ {pathName ?? pathSlug}{" "}
                <code className="text-amber/70 text-[11px] ml-1">
                  ({pathSlug})
                </code>
              </div>
            </div>
          )}
        </>
      )}

      {showHintButton && twistMode !== "plain" && !hintRevealed && (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onReveal}
            className="border border-amber/40 text-amber/80 hover:bg-amber/10 px-2 py-1 text-[11px] uppercase tracking-wider transition-colors"
          >
            ▸ reveal hint
          </button>
          {autoHintAt != null && autoHintRemainingSec != null && autoHintRemainingSec > 0 && (
            <span className="text-[10px] text-muted">
              auto-reveal in {fmt(autoHintRemainingSec)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
