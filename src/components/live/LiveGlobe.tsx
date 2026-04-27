"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { LiveEvent } from "@/lib/live/events";

// react-globe.gl pulls in three.js — lazy-load so it never lands in
// the rest of the app's bundle. /live is the only place that needs it.
const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-muted text-xs font-mono">
      loading globe…
    </div>
  ),
});

type Submission = LiveEvent & { id: string };

type Pulse = {
  id: string;
  lat: number;
  lng: number;
  username: string;
  trackSlug: string;
  levelIdx: number;
  isHallOfFame: boolean;
};

const RECENT_LIMIT = 30;
const PULSE_TTL_MS = 6000;

export function LiveGlobe() {
  const [recent, setRecent] = useState<Submission[]>([]);
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Stable id counter for synthetic event ids; the SSE event has no
  // id of its own.
  const nextId = useRef(0);

  // Subscribe to SSE feed.
  useEffect(() => {
    const es = new EventSource("/api/live/events");
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as LiveEvent;
        if (ev.type !== "submission") return;
        const id = `sub-${++nextId.current}`;
        setRecent((prev) => [{ ...ev, id }, ...prev].slice(0, RECENT_LIMIT));
        if (ev.geo) {
          const pulse: Pulse = {
            id,
            lat: ev.geo.lat,
            lng: ev.geo.lon,
            username: ev.username,
            trackSlug: ev.trackSlug,
            levelIdx: ev.levelIdx,
            isHallOfFame: !!ev.isHallOfFame,
          };
          setPulses((prev) => [...prev, pulse]);
          // Auto-prune so a quiet day doesn't accumulate stale pulses.
          window.setTimeout(() => {
            setPulses((prev) => prev.filter((p) => p.id !== id));
          }, PULSE_TTL_MS);
        }
      } catch {
        // ignore malformed
      }
    };
    return () => es.close();
  }, []);

  // Track container size for the globe.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setSize({ w: cr.width, h: cr.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Country leaderboard (last 30 events).
  const countryStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recent) {
      const c = r.geo?.country ?? "??";
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [recent]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 h-[calc(100vh-180px)]">
      <div
        ref={containerRef}
        className="relative border border-amber/20 bg-black overflow-hidden"
      >
        <Globe
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          atmosphereColor="#f59e0b"
          atmosphereAltitude={0.18}
          ringsData={pulses}
          ringLat={(d: object) => (d as Pulse).lat}
          ringLng={(d: object) => (d as Pulse).lng}
          ringMaxRadius={5}
          ringPropagationSpeed={2}
          ringRepeatPeriod={800}
          ringColor={(d: object) => {
            const p = d as Pulse;
            return p.isHallOfFame
              ? () => "rgba(245,158,11,1)"
              : () => "rgba(245,158,11,0.7)";
          }}
          ringAltitude={0.01}
          pointsData={pulses}
          pointLat={(d: object) => (d as Pulse).lat}
          pointLng={(d: object) => (d as Pulse).lng}
          pointAltitude={0.02}
          pointRadius={0.4}
          pointColor={(d: object) =>
            (d as Pulse).isHallOfFame ? "#fbbf24" : "#f59e0b"
          }
          pointLabel={(d: object) => {
            const p = d as Pulse;
            return `<div style="font-family:monospace;background:#000;border:1px solid #f59e0b;padding:4px 6px;color:#f59e0b;font-size:11px">
              ${p.username} · ${p.trackSlug}/L${p.levelIdx}
            </div>`;
          }}
        />
        <div className="absolute top-2 left-2 text-xs font-mono text-amber/80 pointer-events-none">
          BREACHLAB · LIVE
        </div>
        <div className="absolute bottom-2 right-2 text-xs font-mono text-muted pointer-events-none">
          {pulses.length} active · {recent.length} recent
        </div>
      </div>

      <aside className="border border-amber/20 bg-black p-3 space-y-4 overflow-y-auto text-sm font-mono">
        <section>
          <h3 className="text-amber text-xs uppercase tracking-wider mb-2">
            Recent submissions
          </h3>
          {recent.length === 0 ? (
            <p className="text-muted text-xs">waiting for activity…</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {recent.slice(0, 12).map((r) => (
                <li key={r.id} className="text-muted truncate">
                  <span className={r.isHallOfFame ? "text-amber" : ""}>
                    {r.username}
                  </span>{" "}
                  · {r.trackSlug}/L{r.levelIdx}
                  {r.geo?.country && (
                    <span className="text-muted/60"> · {r.geo.country}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="text-amber text-xs uppercase tracking-wider mb-2">
            By country (last {recent.length})
          </h3>
          {countryStats.length === 0 ? (
            <p className="text-muted text-xs">—</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {countryStats.map(([c, n]) => (
                <li key={c} className="flex justify-between">
                  <span className="text-muted">{c}</span>
                  <span className="text-amber">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
