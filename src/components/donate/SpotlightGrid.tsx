"use client";

import {
  useRef,
  useEffect,
  useState,
  type ReactNode,
  type MouseEvent,
  type CSSProperties,
} from "react";

type Props = {
  children: ReactNode;
  className?: string;
  testId?: string;
};

/**
 * Shared-spotlight grid wrapper.
 *
 * Renders ONE radial glow that follows the cursor across the entire grid
 * surface — including the gaps between cards — so that moving slowly from
 * one card to another creates an AirDrop-style "light bridge" instead of
 * the glow blinking out at each card boundary.
 *
 * The glow position is lerped toward the cursor target at ~15% per frame,
 * giving a subtle trailing/mass feel. Respects prefers-reduced-motion.
 */
export function SpotlightGrid({ children, className = "", testId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Target (cursor) and current (rendered) positions
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
      // Lerp: current catches up to target at ~15% per frame
      const ease = reduceMotion ? 1 : 0.15;
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
    // First move while invisible? Snap current to target so the fade-in
    // starts at the right spot instead of sliding from (0,0).
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
      style={
        {
          "--spotlight-x": "50%",
          "--spotlight-y": "50%",
        } as CSSProperties
      }
    >
      {/* Primary glow — large, soft, fills gaps between cards */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out"
        style={{
          opacity,
          background:
            "radial-gradient(520px circle at var(--spotlight-x) var(--spotlight-y), rgba(255, 176, 0, 0.13), rgba(255, 176, 0, 0.05) 25%, transparent 55%)",
        }}
      />
      {/* Tight core — brighter dot right under the cursor */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out"
        style={{
          opacity: opacity * 0.6,
          background:
            "radial-gradient(180px circle at var(--spotlight-x) var(--spotlight-y), rgba(255, 176, 0, 0.18), transparent 70%)",
          mixBlendMode: "screen",
        }}
      />

      {children}
    </div>
  );
}
