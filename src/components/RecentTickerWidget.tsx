"use client";

import { useEffect, useState } from "react";
import type { LiveEvent } from "@/lib/live/events";
import { OperativeName } from "@/components/operatives/OperativeName";

const MAX = 5;

export function RecentTickerWidget() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  useEffect(() => {
    const es = new EventSource("/api/live/events");
    es.onmessage = (msg) => {
      try {
        const ev = JSON.parse(msg.data) as LiveEvent;
        setEvents((prev) => [ev, ...prev].slice(0, MAX));
      } catch {
        // ignore malformed
      }
    };
    return () => es.close();
  }, []);

  if (events.length === 0) {
    return (
      <section>
        <h2 className="text-muted text-sm uppercase mb-2">▸ Recent</h2>
        <ul className="text-xs space-y-1">
          <li data-testid="recent-event" className="text-muted">
            awaiting first operative
          </li>
        </ul>
      </section>
    );
  }
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Recent</h2>
      <ul className="text-xs space-y-1">
        {events.map((e, i) => (
          <li
            key={`${e.at}-${i}`}
            data-testid="recent-event"
            className="text-text"
          >
            @
            <OperativeName
              username={e.username}
              isHallOfFame={e.isHallOfFame}
              href={`/u/${e.username}`}
              className={e.isHallOfFame ? "" : "text-amber"}
            />{" "}
            owned {e.trackSlug} L{e.levelIdx}
          </li>
        ))}
      </ul>
    </section>
  );
}
