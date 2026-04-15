"use client";

import { useRef, useEffect, useState, type MouseEvent } from "react";
import { SpotlightCard, type SpotlightCardData } from "./SpotlightCard";

type Props = {
  cards: SpotlightCardData[];
  className?: string;
  testId?: string;
};

const BLOB_SIZE = 160;
const BLOB_INFLUENCE_RADIUS = 240;

/**
 * Liquid-merging spotlight grid (AirDrop-style).
 *
 * Each card gets a dedicated "blob" of amber light whose center tracks the
 * cursor, **clamped to that card's own bounding rect**. When the cursor
 * moves through the gap between two cards, both neighbouring blobs are
 * pinned to the edges of their respective cards and an SVG gooey filter
 * (feGaussianBlur → feColorMatrix alpha threshold) fuses them into a
 * single stretched shape — the liquid-bridge you get when two iPhone heads
 * touch during an AirDrop handshake.
 *
 * A subtle ambient radial gradient is rendered behind the blobs as a soft
 * warmth layer that fades in with hover.
 *
 * Respects prefers-reduced-motion: the gooey filter is removed and blobs
 * still render but without the heavy blur.
 */
export function SpotlightGrid({ cards, className = "", testId }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ambientRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef({ x: -9999, y: -9999, active: false });
  const rafRef = useRef<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    function tick() {
      const grid = gridRef.current;
      if (!grid) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const gridRect = grid.getBoundingClientRect();
      const cursor = cursorRef.current;

      // Ambient glow
      if (ambientRef.current) {
        ambientRef.current.style.setProperty(
          "--ambient-x",
          `${cursor.x.toFixed(1)}px`,
        );
        ambientRef.current.style.setProperty(
          "--ambient-y",
          `${cursor.y.toFixed(1)}px`,
        );
        ambientRef.current.style.opacity = cursor.active ? "1" : "0";
      }

      // Per-card gooey blobs
      for (let i = 0; i < cardRefs.current.length; i++) {
        const cardEl = cardRefs.current[i];
        const blob = blobRefs.current[i];
        if (!cardEl || !blob) continue;

        const r = cardEl.getBoundingClientRect();
        const cardX = r.left - gridRect.left;
        const cardY = r.top - gridRect.top;
        const cardW = r.width;
        const cardH = r.height;

        // Clamp cursor to this card's bounding box so the blob stays inside
        const clampedX = Math.max(cardX, Math.min(cardX + cardW, cursor.x));
        const clampedY = Math.max(cardY, Math.min(cardY + cardH, cursor.y));

        // Distance from actual cursor to clamped position = how far outside
        // this card the cursor is (0 if inside)
        const dx = cursor.x - clampedX;
        const dy = cursor.y - clampedY;
        const distance = Math.hypot(dx, dy);

        const influence = Math.max(
          0,
          1 - distance / BLOB_INFLUENCE_RADIUS,
        );
        const opacity = cursor.active ? influence : 0;

        blob.style.left = `${clampedX - BLOB_SIZE / 2}px`;
        blob.style.top = `${clampedY - BLOB_SIZE / 2}px`;
        blob.style.opacity = opacity.toFixed(3);
      }

      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const grid = gridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    cursorRef.current.x = e.clientX - rect.left;
    cursorRef.current.y = e.clientY - rect.top;
    cursorRef.current.active = true;
  }

  function handleMouseLeave() {
    cursorRef.current.active = false;
  }

  return (
    <>
      {/* Gooey SVG filter — defined once, invisible */}
      <svg
        aria-hidden="true"
        width="0"
        height="0"
        className="pointer-events-none absolute"
      >
        <defs>
          <filter id="donate-goo">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="16"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div
        ref={gridRef}
        data-testid={testId}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative ${className}`}
      >
        {/* Layer 1 — ambient radial glow (soft warmth) */}
        <div
          ref={ambientRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out"
          style={{
            opacity: 0,
            background:
              "radial-gradient(560px circle at var(--ambient-x, 50%) var(--ambient-y, 50%), rgba(255, 176, 0, 0.10), rgba(255, 176, 0, 0.04) 30%, transparent 60%)",
            gridColumn: "1 / -1",
            gridRow: "1 / -1",
          }}
        />

        {/* Layer 2 — gooey-filtered blob layer (liquid merge) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            filter: reduceMotion ? undefined : "url(#donate-goo)",
            gridColumn: "1 / -1",
            gridRow: "1 / -1",
          }}
        >
          {cards.map((card, i) => (
            <div
              key={card.testId}
              ref={(el) => {
                blobRefs.current[i] = el;
              }}
              className="absolute transition-opacity duration-200 ease-out"
              style={{
                width: BLOB_SIZE,
                height: BLOB_SIZE,
                borderRadius: "50%",
                backgroundColor: "rgba(255, 176, 0, 0.55)",
                opacity: 0,
                willChange: "left, top, opacity",
              }}
            />
          ))}
        </div>

        {/* Layer 3 — foreground cards */}
        {cards.map((card, i) => (
          <SpotlightCard
            key={card.testId}
            {...card}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
          />
        ))}
      </div>
    </>
  );
}
