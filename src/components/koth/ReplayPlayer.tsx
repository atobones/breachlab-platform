"use client";

import "asciinema-player/dist/bundle/asciinema-player.css";
import { useEffect, useRef } from "react";

// ReplayPlayer — thin client-side wrapper around the asciinema-player
// JS module. The cast text is server-rendered into the page (so the
// page works without JS for read-only metadata) and the player is
// instantiated client-side once on mount.
//
// Why dynamic import: asciinema-player ships an ES module that touches
// `document` at top-level. Importing it at the top of the file makes
// Next.js try to render it server-side, which crashes. Dynamic import
// keeps it strictly client-side.

type Props = {
  cast: string;
  title?: string;
  // Optional autoplay — off by default so the player doesn't blast
  // the player out of context (e.g. embed on a profile page).
  autoPlay?: boolean;
  // Idle-time compression target. Lower = tighter playback (skips
  // longer pauses faster). Player default is 2; we like 1 — feels
  // closer to a screencast than a slideshow.
  idleTimeLimit?: number;
  speed?: number;
};

export function ReplayPlayer({
  cast,
  title,
  autoPlay = false,
  idleTimeLimit = 1,
  speed = 1,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ dispose?: () => void } | null>(null);

  useEffect(() => {
    let disposed = false;

    (async () => {
      const mod = await import("asciinema-player");
      if (disposed || !containerRef.current) return;
      // Strip a possible UTF-8 BOM — sometimes appears at the head of
      // casts produced by environments that helpfully add one. The
      // player's JSONL parser bails on the header line if it does.
      const castText = cast.charCodeAt(0) === 0xfeff ? cast.slice(1) : cast;
      const player = mod.create(
        { data: castText },
        containerRef.current,
        {
          autoPlay,
          idleTimeLimit,
          speed,
          theme: "asciinema",
          // Let the player honour the cast's native cols/rows; locking
          // them here was clipping output and showing a black canvas
          // until clicked. fit:width still scales to container.
          fit: "width",
          terminalFontSize: "14px",
          // No `poster` — sparse session casts rendered a black
          // poster frame and the player stayed parked there showing
          // `--:--` even with autoPlay set. Letting the player draw
          // events from t=0 fixes the black-canvas symptom.
          title,
          logger: console,
        },
      );
      playerRef.current = player;
    })();

    return () => {
      disposed = true;
      try {
        playerRef.current?.dispose?.();
      } catch {
        // Player module's dispose can throw if React rerendered
        // before the dynamic import finished — swallow.
      }
      playerRef.current = null;
    };
  }, [cast, title, autoPlay, idleTimeLimit, speed]);

  return (
    <div
      ref={containerRef}
      // The player injects a `<div>` and styles inside this element.
      // We keep the wrapper minimal so the player's own CSS controls
      // sizing; the parent layout decides max-width.
      className="koth-replay-player block w-full"
      data-testid="koth-replay-player"
    />
  );
}
