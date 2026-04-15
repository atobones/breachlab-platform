"use client";

import Link from "next/link";
import { useRef, useState, type MouseEvent } from "react";

type Props = {
  href: string;
  icon: string;
  title: string;
  summary: string;
  bullets: string[];
  cta: string;
  testId: string;
};

export function SpotlightCard({
  href,
  icon,
  title,
  summary,
  bullets,
  cta,
  testId,
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [opacity, setOpacity] = useState(0);

  function handleMouseMove(e: MouseEvent<HTMLAnchorElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ref.current.style.setProperty("--spotlight-x", `${x}px`);
    ref.current.style.setProperty("--spotlight-y", `${y}px`);
  }

  function handleMouseEnter() {
    setOpacity(1);
  }

  function handleMouseLeave() {
    setOpacity(0);
  }

  return (
    <Link
      ref={ref}
      href={href}
      data-testid={testId}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative flex flex-col gap-3 border border-amber/30 p-5 hover:border-amber transition-colors overflow-hidden"
      style={
        {
          "--spotlight-x": "50%",
          "--spotlight-y": "50%",
        } as React.CSSProperties
      }
    >
      {/* Spotlight glow — radial gradient that follows the cursor */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out"
        style={{
          opacity,
          background:
            "radial-gradient(420px circle at var(--spotlight-x) var(--spotlight-y), rgba(255, 176, 0, 0.12), rgba(255, 176, 0, 0.04) 25%, transparent 55%)",
        }}
      />

      {/* Subtle amber edge glow that brightens on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out"
        style={{
          opacity: opacity * 0.4,
          background:
            "radial-gradient(300px circle at var(--spotlight-x) var(--spotlight-y), rgba(255, 176, 0, 0.06), transparent 70%)",
          mixBlendMode: "screen",
        }}
      />

      {/* Content — sits above the glow */}
      <div className="relative flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-amber text-2xl">
            {icon}
          </span>
          <h2 className="text-amber text-lg group-hover:underline">
            {title}
          </h2>
        </div>
        <p className="text-xs text-muted">{summary}</p>
        <ul className="text-[11px] text-muted space-y-1 list-disc list-inside flex-1">
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <span className="mt-2 text-xs text-amber group-hover:underline">
          {cta}
        </span>
      </div>
    </Link>
  );
}
