"use client";

import {
  useRef,
  useEffect,
  useState,
  type MouseEvent,
} from "react";
import { SpotlightCard, type SpotlightCardData } from "./SpotlightCard";

type Props = {
  cards: SpotlightCardData[];
  className?: string;
  testId?: string;
};

export function SpotlightGrid({ cards, className = "", testId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const posRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    function tick() {
      const p = posRef.current;
      const ease = reduceMotion ? 1 : 0.12;
      p.x += (p.tx - p.x) * ease;
      p.y += (p.ty - p.y) * ease;
      if (containerRef.current) {
        containerRef.current.style.setProperty(
          "--spotlight-x",
          `${p.x.toFixed(2)}px`,
        );
        containerRef.current.style.setProperty(
          "--spotlight-y",
          `${p.y.toFixed(2)}px`,
        );
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [reduceMotion]);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    posRef.current.tx = e.clientX - rect.left;
    posRef.current.ty = e.clientY - rect.top;
    if (opacity === 0) {
      posRef.current.x = posRef.current.tx;
      posRef.current.y = posRef.current.ty;
    }
  }

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out"
        style={{
          opacity,
          background:
            "radial-gradient(520px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(255, 176, 0, 0.13), rgba(255, 176, 0, 0.05) 25%, transparent 55%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out"
        style={{
          opacity: opacity * 0.6,
          background:
            "radial-gradient(180px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(255, 176, 0, 0.18), transparent 70%)",
          mixBlendMode: "screen",
        }}
      />

      {cards.map((card) => (
        <SpotlightCard key={card.testId} {...card} />
      ))}
    </div>
  );
}
