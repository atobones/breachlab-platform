import Link from "next/link";

import type { ReplayListRow } from "@/lib/koth/replays";

type Props = {
  replay: ReplayListRow;
  // When true, render a compact card suitable for splitscreen siblings;
  // otherwise full-width list-item layout.
  compact?: boolean;
};

function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KiB`;
  return `${(b / 1024 / 1024).toFixed(1)} MiB`;
}

function relativeTime(when: Date): string {
  const now = Date.now();
  const diff = Math.floor((now - when.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function kindGlyph(kind: ReplayListRow["kind"]): string {
  switch (kind) {
    case "crown_moment":
      return "👑";
    case "ambient":
      return "·";
    case "session_close":
    default:
      return "▸";
  }
}

function kindColor(kind: ReplayListRow["kind"]): string {
  switch (kind) {
    case "crown_moment":
      return "text-amber border-amber/40";
    case "ambient":
      return "text-muted border-border/40";
    case "session_close":
    default:
      return "text-green border-green/30";
  }
}

export function ReplayCard({ replay, compact = false }: Props) {
  const path = replay.exploitPath;
  const isCrown = replay.kind === "crown_moment";
  const colors = kindColor(replay.kind);

  return (
    <Link
      href={`/battles/koth/replay/${replay.id}`}
      className={`group block border ${colors} bg-bg/40 hover:bg-bg/80 transition-colors p-3 font-mono`}
      data-testid="replay-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-base">{kindGlyph(replay.kind)}</span>
          <span className={`font-semibold ${isCrown ? "text-amber" : "text-text"}`}>
            {replay.username ?? replay.actorSlot}
          </span>
          <span className="text-[11px] text-muted uppercase tracking-wider">
            {replay.kind.replace("_", " ")}
          </span>
        </div>
        <div className="text-[11px] text-muted shrink-0">
          {relativeTime(replay.uploadedAt)}
        </div>
      </div>

      {!compact && (
        <div className="mt-2 flex items-baseline gap-3 text-[12px] text-muted">
          {path ? (
            <code className="text-amber/80 truncate" title={path}>
              {path}
            </code>
          ) : (
            <span className="text-muted/60 italic">no path link</span>
          )}
          <span className="ml-auto shrink-0">
            {formatDuration(replay.durationSec)}
          </span>
          <span className="shrink-0">{formatBytes(replay.byteSize)}</span>
        </div>
      )}

      {compact && (
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
          <span className="truncate">{path ?? replay.actorSlot}</span>
          <span>{formatDuration(replay.durationSec)}</span>
        </div>
      )}
    </Link>
  );
}
