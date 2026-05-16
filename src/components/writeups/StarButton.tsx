"use client";
import { useState, useTransition } from "react";

export function StarButton({
  writeupId,
  initialStarred,
  initialScore,
  disabled,
  disabledReason,
}: {
  writeupId: string;
  initialStarred: boolean;
  initialScore: number;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [starred, setStarred] = useState(initialStarred);
  const [score, setScore] = useState(initialScore);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = () => {
    if (disabled) return;
    const next = !starred;
    setStarred(next);
    setScore((s) => s + (next ? 1 : -1));
    setError(null);
    startTransition(async () => {
      let res: Response;
      try {
        res = await fetch(`/api/writeups/${writeupId}/star`, {
          method: next ? "POST" : "DELETE",
        });
      } catch {
        setStarred(!next);
        setScore((s) => s + (next ? -1 : 1));
        setError("Network error — try again");
        return;
      }
      if (!res.ok) {
        setStarred(!next);
        setScore((s) => s + (next ? -1 : 1));
        setError(
          res.status === 401
            ? "Log in to star"
            : res.status === 403
              ? "Blocked by firewall — refresh page"
              : `Error ${res.status} — try again`,
        );
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled || isPending}
        title={disabled ? disabledReason ?? "Locked" : starred ? "Unstar" : "Star"}
        className={`inline-flex items-center gap-1.5 px-2 py-1 border ${
          disabled
            ? "border-border text-muted/50 cursor-not-allowed"
            : starred
              ? "border-amber/60 text-amber hover:bg-amber/10"
              : "border-border text-amber hover:border-amber/60 hover:bg-amber/10"
        }`}
        data-testid="star-button"
        aria-pressed={starred}
      >
        <span aria-hidden className="text-base leading-none">
          {starred ? "★" : "☆"}
        </span>
        <span className="text-sm font-medium tabular-nums">{score}</span>
      </button>
      {error ? (
        <p className="text-[10px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
