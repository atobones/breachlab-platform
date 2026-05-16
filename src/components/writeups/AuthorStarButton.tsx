"use client";
import { useState, useTransition } from "react";

export function AuthorStarButton({
  authorId,
  initialStarred,
  initialScore,
  disabled,
  disabledReason,
}: {
  authorId: string;
  initialStarred: boolean;
  initialScore: number;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [starred, setStarred] = useState(initialStarred);
  const [score, setScore] = useState(initialScore);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    if (disabled) return;
    const next = !starred;
    setStarred(next);
    setScore((s) => s + (next ? 1 : -1));
    startTransition(async () => {
      const method = next ? "POST" : "DELETE";
      const res = await fetch(`/api/authors/${authorId}/star`, { method });
      if (!res.ok) {
        setStarred(!next);
        setScore((s) => s + (next ? -1 : 1));
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || isPending}
      title={disabled ? disabledReason ?? "Locked" : starred ? "Unstar" : "Star"}
      className={`inline-flex items-center gap-1.5 px-2 py-1 border border-border ${
        disabled
          ? "text-muted/50 cursor-not-allowed"
          : starred
            ? "border-amber/60 text-amber hover:bg-amber/10"
            : "text-amber hover:border-amber/60 hover:bg-amber/10"
      }`}
      data-testid="author-star-button"
      aria-pressed={starred}
    >
      <span aria-hidden className="text-base leading-none">
        {starred ? "★" : "☆"}
      </span>
      <span className="text-sm font-medium tabular-nums">{score}</span>
    </button>
  );
}
