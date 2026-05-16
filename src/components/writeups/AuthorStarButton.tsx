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
      className={`inline-flex items-center gap-1 text-xs ${
        disabled ? "text-muted/50 cursor-not-allowed" : "text-amber hover:underline"
      }`}
      data-testid="author-star-button"
      aria-pressed={starred}
    >
      <span aria-hidden>{starred ? "★" : "☆"}</span>
      <span>{score}</span>
    </button>
  );
}
