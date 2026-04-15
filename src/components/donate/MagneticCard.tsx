"use client";

import Link from "next/link";
import { useRef, useState, useEffect, type MouseEvent } from "react";

type Props = {
  href: string;
  icon: string;
  title: string;
  summary: string;
  bullets: string[];
  cta: string;
  testId: string;
};

const STRENGTH = 0.08;

export function MagneticCard({
  href,
  icon,
  title,
  summary,
  bullets,
  cta,
  testId,
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [transform, setTransform] = useState("translate3d(0,0,0)");
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function handleMouseMove(e: MouseEvent<HTMLAnchorElement>) {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTransform(
      `translate3d(${(x * STRENGTH).toFixed(2)}px, ${(y * STRENGTH).toFixed(2)}px, 0)`,
    );
  }

  function handleMouseLeave() {
    setTransform("translate3d(0,0,0)");
  }

  return (
    <Link
      ref={ref}
      href={href}
      data-testid={testId}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative flex flex-col gap-3 border border-amber/30 p-5 hover:border-amber hover:bg-amber/5 transition-colors overflow-hidden"
    >
      <div
        className="flex flex-col gap-3 flex-1"
        style={{
          transform,
          transition: reduceMotion
            ? undefined
            : "transform 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          willChange: "transform",
        }}
      >
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
