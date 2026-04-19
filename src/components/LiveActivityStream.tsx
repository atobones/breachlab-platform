"use client";

import { useEffect, useState } from "react";
import type { LiveEvent } from "@/lib/live/events";

const MAX = 8;

function ts() {
  const d = new Date();
  return d.toISOString().slice(11, 19);
}

export function LiveActivityStream() {
  const [events, setEvents] = useState<{ at: string; line: string }[]>([]);

  useEffect(() => {
    const es = new EventSource("/api/live/events");
    es.onmessage = (msg) => {
      try {
        const ev = JSON.parse(msg.data) as LiveEvent;
        const line = `@${ev.username} owned ${ev.trackSlug}/lvl${ev.levelIdx}  →  ${ev.levelTitle}`;
        setEvents((prev) => [{ at: ts(), line }, ...prev].slice(0, MAX));
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, []);

  if (events.length === 0) {
    return (
      <div className="ops-stream ops-stream-empty">
        <span className="text-muted">awaiting first transmission</span>
        <span className="cursor" aria-hidden />
      </div>
    );
  }

  return (
    <ul className="ops-stream">
      {events.map((e, i) => (
        <li key={`${e.at}-${i}`} className="ops-stream-row">
          <span className="ops-stream-ts">{e.at}</span>
          <span className="ops-stream-line">{e.line}</span>
        </li>
      ))}
    </ul>
  );
}
