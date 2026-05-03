"use client";

import Link from "next/link";
import { useState } from "react";

type TrackStatus = "LIVE" | "SOON" | "PLANNED";
type Track = { slug: string; name: string; status: TrackStatus };
type SubTrack = { slug: string; name: string; status: TrackStatus };

const TRACKS: Track[] = [
  { slug: "ghost", name: "Ghost", status: "LIVE" },
  { slug: "phantom", name: "Phantom", status: "LIVE" },
  { slug: "specter", name: "Specter", status: "LIVE" },
  { slug: "mirage", name: "Mirage", status: "PLANNED" },
  { slug: "cipher", name: "Cipher", status: "PLANNED" },
  { slug: "nexus", name: "Nexus", status: "PLANNED" },
  { slug: "oracle", name: "Oracle", status: "PLANNED" },
  { slug: "wraith", name: "Wraith", status: "PLANNED" },
  { slug: "shadow", name: "Shadow", status: "PLANNED" },
  { slug: "sentinel", name: "Sentinel", status: "PLANNED" },
  { slug: "prism", name: "Prism", status: "PLANNED" },
  { slug: "venom", name: "Venom", status: "PLANNED" },
  { slug: "flux", name: "Flux", status: "PLANNED" },
];

const SPECTER_SUBTRACKS: SubTrack[] = [
  { slug: "specter/i", name: "I — OSINT", status: "LIVE" },
  { slug: "specter/ii", name: "II — Network & WiFi", status: "PLANNED" },
  { slug: "specter/iii", name: "III — Defence Evasion", status: "PLANNED" },
];

const STATUS_COLOR: Record<TrackStatus, string> = {
  LIVE: "text-green",
  SOON: "text-amber",
  PLANNED: "text-muted",
};

export function TracksNav() {
  const [specterOpen, setSpecterOpen] = useState(false);
  const [glitching, setGlitching] = useState(false);

  function toggleSpecter() {
    setGlitching(true);
    // Burst lasts 700ms; flip the open state at ~280ms so the glitch
    // visually "tears open" the row before the sub-tracks cascade in.
    window.setTimeout(() => setSpecterOpen((v) => !v), 280);
    window.setTimeout(() => setGlitching(false), 720);
  }

  return (
    <nav aria-label="Tracks">
      <h2 className="text-muted text-sm uppercase mb-2">▸ Tracks</h2>
      <ul className="space-y-1 text-sm">
        {TRACKS.map((t) => {
          if (t.slug === "specter") {
            return (
              <li key={t.slug}>
                <button
                  type="button"
                  onClick={toggleSpecter}
                  aria-expanded={specterOpen}
                  aria-controls="specter-subtracks"
                  className="w-full flex justify-between items-baseline cursor-pointer text-left hover:text-amber transition-colors"
                >
                  <span
                    className={glitching ? "glitch-burst" : ""}
                    data-text={t.name}
                  >
                    <span className="underline decoration-dotted underline-offset-4">
                      {t.name}
                    </span>
                    <span className="text-muted ml-1 text-xs">
                      {specterOpen ? "▾" : "▸"}
                    </span>
                  </span>
                  <span className={STATUS_COLOR[t.status]}>{t.status}</span>
                </button>

                {specterOpen && (
                  <ul
                    id="specter-subtracks"
                    className="mt-1 mb-2 ml-4 space-y-1 border-l border-border pl-3"
                  >
                    {SPECTER_SUBTRACKS.map((s) => (
                      <li
                        key={s.slug}
                        className="subtrack-row flex justify-between text-xs"
                      >
                        <Link
                          href={`/tracks/${s.slug}`}
                          className="hover:text-amber"
                        >
                          {s.name}
                        </Link>
                        <span className={STATUS_COLOR[s.status]}>
                          {s.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          }

          return (
            <li key={t.slug} className="flex justify-between">
              <Link href={`/tracks/${t.slug}`}>{t.name}</Link>
              <span className={STATUS_COLOR[t.status]}>{t.status}</span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
