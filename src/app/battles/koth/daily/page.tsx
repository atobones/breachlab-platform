import { Metadata } from "next";
import Link from "next/link";

import {
  getDailyLeaderboard,
  getOrCreateTodaySeed,
  getDailyStreak,
  secondsUntilNextSeed,
  todayUtcString,
} from "@/lib/koth/daily";
import { getCurrentSession } from "@/lib/auth/session";
import { DailyClient } from "@/components/koth/DailyClient";

export const metadata: Metadata = {
  title: "Daily Challenge — Crown Wars — BreachLab",
  description:
    "One primitive a day, same configuration for every player worldwide. Take crown faster than yesterday's top time.",
};

export const dynamic = "force-dynamic";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtCountdown(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Challenge number — days since the project epoch. Gives a Wordle-like
// "Daily #347" identifier players can reference across posts.
const EPOCH = new Date("2026-05-01T00:00:00Z").getTime();
function challengeNumber(day: string): number {
  const d = new Date(day + "T00:00:00Z").getTime();
  return Math.max(1, Math.floor((d - EPOCH) / 86400_000) + 1);
}

export default async function DailyPage() {
  const seed = await getOrCreateTodaySeed();
  const day = seed?.dayUtc ?? todayUtcString();
  const leaderboard = await getDailyLeaderboard(day, 20);
  const { user } = await getCurrentSession();
  const streak = user ? await getDailyStreak(user.id) : 0;
  const secsLeft = secondsUntilNextSeed();
  const chNum = challengeNumber(day);

  return (
    <article className="space-y-6 max-w-4xl">
      <header className="space-y-2">
        <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono flex items-center gap-3">
          <Link
            href="/battles/koth"
            className="hover:text-amber transition-colors"
          >
            ← crown wars
          </Link>
          <span className="text-muted/40">|</span>
          <span>daily challenge</span>
        </div>
        <h1 className="text-amber text-2xl sm:text-3xl phosphor wordmark font-bold tracking-[0.04em]">
          DAILY · #{chNum}
        </h1>
        <p className="text-[14px] leading-relaxed text-muted max-w-3xl">
          One primitive a day. Every operator on the planet gets the same
          configuration — your time goes on a shared leaderboard. Resets at
          00:00 UTC. Wordle, but with root shells.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-[12px]">
        <Tile label="day" value={day} />
        <Tile label="challenge" value={`#${chNum}`} />
        <Tile label="next reset" value={fmtCountdown(secsLeft)} mono />
        <Tile
          label="your streak"
          value={user ? `${streak} day${streak === 1 ? "" : "s"}` : "—"}
        />
      </section>

      {seed ? (
        <DailyClient
          day={day}
          pathSlug={seed.pathSlug}
          pathName={seed.pathName}
          challengeNumber={chNum}
        />
      ) : (
        <div className="border border-red/40 text-red p-6 font-mono text-sm">
          ⚠ no daily seed available — the catalog appears empty. ping admin.
        </div>
      )}

      <section className="border border-border/40">
        <div className="px-3 py-2 border-b border-border/40 bg-amber/[0.04]">
          <div className="text-[10px] text-amber/80 tracking-[0.3em] uppercase font-mono">
            ▸ leaderboard · today
          </div>
        </div>
        {leaderboard.length === 0 ? (
          <div className="p-6 text-center text-muted font-mono text-sm">
            No one has crowned today&apos;s challenge yet. Be first.
          </div>
        ) : (
          <ol className="divide-y divide-border/30 font-mono text-[13px]">
            {leaderboard.map((row, i) => (
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
                <span className="text-text">
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
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="pt-4 border-t border-border/40 text-[11px] text-muted font-mono leading-relaxed">
        <p>
          Daily seed is deterministic — every UTC day, a SHA256 of the date
          picks one escalation path from the catalog. Two web instances land
          on the same pick without coordinating. The challenge is to take
          crown via that specific primitive faster than your peers.
        </p>
      </footer>
    </article>
  );
}

function Tile({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="border border-border/40 bg-bg/40 p-3">
      <div className="text-[10px] text-amber/80 uppercase tracking-widest">
        {label}
      </div>
      <div className={`text-text mt-1 ${mono ? "tabular-nums" : ""}`}>
        {value}
      </div>
    </div>
  );
}
