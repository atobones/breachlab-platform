"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Track = { slug: string; name: string; levelCount: number };

export function WriteupSubmitForm({ tracks }: { tracks: Track[] }) {
  const router = useRouter();
  const [trackSlug, setTrackSlug] = useState(tracks[0]?.slug ?? "");
  const [levelIdx, setLevelIdx] = useState(0);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const selectedTrack = tracks.find((t) => t.slug === trackSlug);
  const maxLevel = (selectedTrack?.levelCount ?? 1) - 1;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/writeups/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trackSlug, levelIdx, title, brief, externalUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setDone(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <p className="text-sm text-amber">
        Submitted — pending Boss review. You&apos;ll see it appear on /writeups
        once approved.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-muted">
          Track
          <select
            value={trackSlug}
            onChange={(e) => setTrackSlug(e.target.value)}
            className="mt-1 block w-full bg-bg border border-border px-2 py-1 text-sm"
          >
            {tracks.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-muted">
          Level
          <input
            type="number"
            min={0}
            max={maxLevel}
            value={levelIdx}
            onChange={(e) => setLevelIdx(Number(e.target.value))}
            className="mt-1 block w-full bg-bg border border-border px-2 py-1 text-sm"
          />
        </label>
      </div>

      <label className="block text-xs text-muted">
        Title (≤120) <span className="text-amber">{title.length}/120</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
          className="mt-1 block w-full bg-bg border border-border px-2 py-1 text-sm"
        />
      </label>

      <label className="block text-xs text-muted">
        Brief (≤280) <span className="text-amber">{brief.length}/280</span>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          maxLength={280}
          required
          rows={3}
          className="mt-1 block w-full bg-bg border border-border px-2 py-1 text-sm"
        />
      </label>

      <label className="block text-xs text-muted">
        External URL (your writeup page)
        <input
          type="url"
          value={externalUrl}
          onChange={(e) => setExternalUrl(e.target.value)}
          required
          className="mt-1 block w-full bg-bg border border-border px-2 py-1 text-sm"
        />
      </label>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="px-3 py-1 border border-amber text-amber text-sm uppercase tracking-wider hover:bg-amber/10"
      >
        {submitting ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
