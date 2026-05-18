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
      const player = mod.create(
        // The library accepts a "source" object — `data` for inline
        // text content (instead of a URL fetched at runtime).
        { data: cast },
        containerRef.current,
        {
          autoPlay,
          idleTimeLimit,
          speed,
          // Custom theme — match BL's amber-on-black palette. asciinema
          // ships several built-ins (asciinema/tango/solarized-dark/
          // solarized-light/monokai/nord/dracula); "asciinema" stays
          // closest to our existing terminal look.
          theme: "asciinema",
          // Keep the original recording's dimensions but cap to fit
          // typical desktop widths (sidebar layout = ~800px usable).
          cols: 100,
          rows: 30,
          // Bigger font on the player than the default — feels
          // confident, like a featured artifact.
          fit: "width",
          terminalFontSize: "14px",
          // Title shown in the player metadata header.
          title,
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
