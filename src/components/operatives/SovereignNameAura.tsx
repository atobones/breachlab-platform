/**
 * Animated green smoke aura that wraps the Specter Sovereign's name.
 *
 * Same SVG turbulence + displacement-map effect as the SHELL button's
 * pre-Sovereign haze, scaled down to name-tag dimensions. Renders behind
 * the name with `position: absolute`, the name sits on top via z-index.
 *
 * Cycles forever — no end state — same as the original button haze. Per
 * design: when the first Sovereign emerges, the button haze disappears
 * and lives on this name from then on, permanently.
 */
"use client";

import { useId } from "react";

type Props = {
  /** Diameter of the aura in px. Defaults to fit ~16px font height. */
  size?: number;
  children: React.ReactNode;
};

export function SovereignNameAura({ size = 36, children }: Props) {
  // Unique filter IDs per instance — SVG filter refs are global so if
  // two auras share an ID one of them inherits the other's animation.
  const uid = useId().replace(/:/g, "");
  const filterId = `sov-aura-${uid}`;
  const gradId = `sov-grad-${uid}`;

  return (
    <span
      className="sovereign-aura"
      style={{
        position: "relative",
        display: "inline-block",
        isolation: "isolate",
      }}
    >
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: `-${Math.round(size * 0.25)}px -${Math.round(size * 0.35)}px`,
          width: `calc(100% + ${Math.round(size * 0.7)}px)`,
          height: `calc(100% + ${Math.round(size * 0.5)}px)`,
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        <defs>
          <filter
            id={filterId}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.020 0.030"
              numOctaves={3}
              seed={5}
              result="n"
            >
              <animate
                attributeName="baseFrequency"
                dur="34s"
                calcMode="spline"
                values="0.020 0.030; 0.018 0.032; 0.022 0.028; 0.020 0.030"
                keyTimes="0; 0.33; 0.66; 1"
                keySplines="0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="n"
              scale={22}
              xChannelSelector="R"
              yChannelSelector="G"
            >
              <animate
                attributeName="scale"
                dur="41s"
                calcMode="spline"
                values="22; 26; 19; 22"
                keyTimes="0; 0.33; 0.66; 1"
                keySplines="0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1"
                repeatCount="indefinite"
              />
            </feDisplacementMap>
            <feGaussianBlur stdDeviation={2.5} />
          </filter>
          <radialGradient id={gradId} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#00ff88" stopOpacity="0.75" />
            <stop offset="40%" stopColor="#22c55e" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#10b981" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse
          cx={50}
          cy={20}
          rx={45}
          ry={18}
          fill={`url(#${gradId})`}
          filter={`url(#${filterId})`}
        />
      </svg>
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </span>
  );
}
