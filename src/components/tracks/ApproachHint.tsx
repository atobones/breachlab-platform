"use client";

import { useEffect, useState } from "react";

const UNLOCK_MS = 20 * 60 * 1000; // 20 minutes

function formatMmSs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ApproachHint({
  approach,
  levelIdx,
  username,
}: {
  approach: string;
  levelIdx: number;
  username: string | null;
}) {
  const key = `phantom-approach-${username ?? "anon"}-${levelIdx}`;
  const [unlockAt, setUnlockAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) {
      setUnlockAt(parseInt(stored, 10));
    } else {
      const t = Date.now() + UNLOCK_MS;
      localStorage.setItem(key, String(t));
      setUnlockAt(t);
    }
    const revealKey = `${key}-revealed`;
    if (localStorage.getItem(revealKey) === "1") {
      setRevealed(true);
    }
  }, [key]);

  useEffect(() => {
    if (revealed) return;
    const int = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(int);
  }, [revealed]);

  if (unlockAt === null) {
    return null;
  }

  const remaining = unlockAt - now;
  const unlocked = remaining <= 0;

  function handleReveal() {
    setRevealed(true);
    localStorage.setItem(`${key}-revealed`, "1");
  }

  if (revealed) {
    return (
      <aside
        data-testid="approach-hint-revealed"
        className="border border-dashed border-amber/50 p-3 text-xs text-muted space-y-1"
      >
        <div className="text-amber uppercase tracking-widest text-[10px]">
          ▸ Approach
        </div>
        <p className="text-text whitespace-pre-line">{approach}</p>
        <p className="text-[10px] italic opacity-70">
          Category hint only — not a walkthrough. Keep trying to find the
          specific primitive yourself.
        </p>
      </aside>
    );
  }

  return (
    <aside
      data-testid="approach-hint-locked"
      className="border border-dashed border-muted/30 p-3 text-xs text-muted"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="uppercase tracking-widest text-[10px]">
          ▸ Approach
        </span>
        {unlocked ? (
          <button
            type="button"
            onClick={handleReveal}
            className="px-2 py-0.5 border border-amber text-amber text-[10px] uppercase tracking-widest hover:bg-amber/10"
          >
            Show approach
          </button>
        ) : (
          <span className="text-[10px] font-mono">
            unlocks in {formatMmSs(remaining)}
          </span>
        )}
      </div>
    </aside>
  );
}
