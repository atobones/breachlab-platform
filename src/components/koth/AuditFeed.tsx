"use client";

import { useEffect, useRef, useState } from "react";

// Crown Wars — Live Audit Feed widget.
//
// Subscribes to /api/koth/audit/stream (SSE) and renders the last ~60
// syscalls of the current crown holder, colour-coded by class. Re-
// connects on transient disconnects and survives crown rotation
// (server pushes a `crown-rotated` event that resets our local tail).

type Line = {
  id: number;
  ts: string;
  klass: string;
  summary: string;
  username: string | null;
  slot: string | null;
};

const CLASS_COLOR: Record<string, string> = {
  execve: "text-amber",
  openat: "text-text",
  setuid: "text-red-400",
  network: "text-blue-400",
  fs: "text-text/80",
  other: "text-muted",
};

const CLASS_GLYPH: Record<string, string> = {
  execve: "▶",
  openat: "◇",
  setuid: "⚠",
  network: "↯",
  fs: "·",
  other: "·",
};

function fmtTime(iso: string): string {
  return iso.slice(11, 19);
}

export function AuditFeed() {
  const [lines, setLines] = useState<Line[]>([]);
  const [status, setStatus] = useState<
    "connecting" | "live" | "idle" | "error" | "disconnected"
  >("connecting");
  const [holder, setHolder] = useState<{
    username: string | null;
    slot: string | null;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/koth/audit/stream");

    es.addEventListener("seed", (ev) => {
      try {
        const payload = JSON.parse((ev as MessageEvent).data) as {
          events: Line[];
        };
        setLines(payload.events);
        setStatus("live");
        if (payload.events.length > 0) {
          const last = payload.events[payload.events.length - 1];
          setHolder({ username: last.username, slot: last.slot });
        }
      } catch {
        setStatus("error");
      }
    });

    es.addEventListener("delta", (ev) => {
      try {
        const payload = JSON.parse((ev as MessageEvent).data) as {
          events: Line[];
        };
        if (payload.events.length === 0) return;
        setLines((prev) => {
          const next = [...prev, ...payload.events];
          // Keep the buffer trimmed; 120 lines is enough for ~1 minute
          // of busy crown activity without growing the DOM unboundedly.
          return next.length > 120 ? next.slice(next.length - 120) : next;
        });
        const last = payload.events[payload.events.length - 1];
        setHolder({ username: last.username, slot: last.slot });
      } catch {
        setStatus("error");
      }
    });

    es.addEventListener("crown-rotated", () => {
      setLines([]);
      setHolder(null);
    });

    es.addEventListener("idle", () => {
      setStatus("idle");
    });

    es.addEventListener("error", () => {
      setStatus("disconnected");
    });

    es.onerror = () => {
      setStatus("disconnected");
    };

    return () => {
      es.close();
    };
  }, []);

  // Auto-scroll to bottom whenever lines change (skip if user has
  // scrolled up to read history).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
    if (distance < 60) {
      el.scrollTop = el.scrollHeight;
    }
  }, [lines]);

  // Hide the widget entirely until there's something to show OR the
  // stream is in an error state worth surfacing.
  if (lines.length === 0 && (status === "live" || status === "connecting" || status === "idle")) {
    return null;
  }

  return (
    <section className="border border-amber/40 bg-bg/30 font-mono">
      <div className="px-3 py-2 border-b border-amber/30 bg-amber/[0.04] flex items-center justify-between gap-2 flex-wrap text-[11px]">
        <div className="text-amber tracking-[0.18em] uppercase">
          ▸ live audit
        </div>
        <div className="text-muted flex items-center gap-2">
          {status === "live" && (
            <>
              <span className="pulse-dot text-green">●</span>
              <span className="text-green/80">streaming</span>
            </>
          )}
          {status === "connecting" && (
            <>
              <span className="text-amber/60">○</span>
              <span>connecting…</span>
            </>
          )}
          {status === "idle" && <span>no active round</span>}
          {status === "error" && (
            <span className="text-red-400">stream error</span>
          )}
          {status === "disconnected" && (
            <span className="text-red-400/80">disconnected — reload to retry</span>
          )}
          {holder && (
            <span className="text-amber/80">
              · king:{" "}
              <span className="text-amber">
                {holder.username ?? holder.slot ?? "?"}
              </span>
            </span>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="overflow-y-auto max-h-72 px-3 py-2 leading-[1.45] text-[11.5px]"
      >
        {lines.length === 0 ? (
          <p className="text-muted">
            {status === "idle"
              ? "no active round."
              : status === "live" || status === "connecting"
                ? "waiting for king activity…"
                : "audit feed unavailable."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {lines.map((l) => (
              <li key={l.id} className="flex items-baseline gap-2 tabular-nums">
                <span className="text-amber/60 w-14 shrink-0">
                  {fmtTime(l.ts)}
                </span>
                <span
                  className={`${CLASS_COLOR[l.klass] ?? "text-muted"} w-3 shrink-0`}
                >
                  {CLASS_GLYPH[l.klass] ?? "·"}
                </span>
                <span
                  className={`${CLASS_COLOR[l.klass] ?? "text-text"} flex-1 break-all`}
                >
                  {l.summary}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

    </section>
  );
}
