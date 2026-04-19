"use client";

import { useEffect, useRef, useState } from "react";

const COOKIE_NAME = "bl_booted";
const COOKIE_MAXAGE = 60 * 60 * 24 * 365; // 1 year

type Line =
  | { kind: "kernel"; ts: string; text: string }
  | { kind: "ok"; text: string }
  | { kind: "warn"; text: string }
  | { kind: "ready"; text: string }
  | { kind: "blank" };

const SCRIPT: Line[] = [
  { kind: "kernel", ts: "    0.000000", text: "Linux version 6.8.0-breachlab (operator@breachlab)" },
  { kind: "kernel", ts: "    0.000123", text: "Command line: ro quiet splash bl_init=offensive" },
  { kind: "kernel", ts: "    0.012410", text: "BIOS-provided physical RAM map:" },
  { kind: "kernel", ts: "    0.024812", text: "x86/fpu: Supporting XSAVE feature 0x004: 'AVX'" },
  { kind: "kernel", ts: "    0.041238", text: "ACPI: Local APIC address 0xfee00000" },
  { kind: "kernel", ts: "    0.073612", text: "Memory: 8047128K/8388608K available" },
  { kind: "kernel", ts: "    0.124710", text: "Console: switching to colour frame buffer device 240x67" },
  { kind: "kernel", ts: "    0.234123", text: "TCP: cubic registered" },
  { kind: "kernel", ts: "    0.412901", text: "EXT4-fs (sda1): mounted filesystem with ordered data mode" },
  { kind: "blank" },
  { kind: "ok", text: "Started Network Time Synchronization" },
  { kind: "ok", text: "Started OpenSSH Daemon (sshd)" },
  { kind: "ok", text: "Started breachlab-core.service" },
  { kind: "ok", text: "Mounted /opt/breachlab — wargame infrastructure" },
  { kind: "blank" },
  { kind: "kernel", ts: "    1.823014", text: "BL: loading 13 tracks..." },
  { kind: "kernel", ts: "    1.901247", text: "BL: ghost track armed (22 lvl)" },
  { kind: "kernel", ts: "    1.984710", text: "BL: phantom track armed (32 lvl)" },
  { kind: "kernel", ts: "    2.124012", text: "BL: graduation watcher ready" },
  { kind: "kernel", ts: "    2.213412", text: "BL: live ops bus connected" },
  { kind: "kernel", ts: "    2.401239", text: "BL: badges service registered" },
  { kind: "warn", text: "BL: 11 tracks pending — Specter, Mirage, Cipher, Nexus, Oracle, Wraith, Shadow, Sentinel, Prism, Venom, Flux" },
  { kind: "blank" },
  { kind: "kernel", ts: "    3.012412", text: "BL: founding cohort gate active (cap 100)" },
  { kind: "kernel", ts: "    3.234123", text: "BL: leaderboard rebuild complete" },
  { kind: "blank" },
  { kind: "ready", text: "breachlab.org operational — entering interactive shell" },
];

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[2]) : null;
}

function setBootedCookie() {
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${COOKIE_MAXAGE}; samesite=lax`;
}

export function BootSequence() {
  // mounted flag — render nothing on the first paint to avoid an SSR/hydration
  // mismatch. The booted check is client-only (cookie + media query).
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const [active, setActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (getCookie(COOKIE_NAME) === "1") return;
    // Respect prefers-reduced-motion — skip the animation, set cookie.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setBootedCookie();
      return;
    }
    setActive(true);
  }, []);

  // Drip-feed lines.
  useEffect(() => {
    if (!active || done) return;
    if (shown >= SCRIPT.length) {
      const t = setTimeout(() => {
        setBootedCookie();
        setDone(true);
      }, 700);
      return () => clearTimeout(t);
    }
    const next = SCRIPT[shown];
    // Variable cadence — kernel lines are fast, blank/ok lines breathe.
    const delay =
      next.kind === "kernel" ? 35 :
      next.kind === "ok"     ? 90 :
      next.kind === "warn"   ? 220 :
      next.kind === "ready"  ? 450 :
      next.kind === "blank"  ? 60 :
      80;
    const t = setTimeout(() => setShown((n) => n + 1), delay);
    return () => clearTimeout(t);
  }, [active, shown, done]);

  // Auto-scroll to bottom as lines come in.
  useEffect(() => {
    containerRef.current?.scrollTo(0, containerRef.current.scrollHeight);
  }, [shown]);

  // Skip on any key or click anywhere.
  useEffect(() => {
    if (!active || done) return;
    const skip = () => {
      setBootedCookie();
      setDone(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, done]);

  if (!mounted || !active || done) return null;

  return (
    <div
      className="boot-overlay"
      role="presentation"
      onClick={() => {
        setBootedCookie();
        setDone(true);
      }}
    >
      <div className="boot-frame" ref={containerRef}>
        {SCRIPT.slice(0, shown).map((l, i) => {
          if (l.kind === "blank") return <div key={i} className="boot-line">&nbsp;</div>;
          if (l.kind === "kernel") {
            return (
              <div key={i} className="boot-line">
                <span className="boot-ts">[{l.ts}]</span> {l.text}
              </div>
            );
          }
          if (l.kind === "ok") {
            return (
              <div key={i} className="boot-line">
                <span className="boot-tag boot-ok">[  OK  ]</span> {l.text}
              </div>
            );
          }
          if (l.kind === "warn") {
            return (
              <div key={i} className="boot-line">
                <span className="boot-tag boot-warn">[ WARN ]</span> {l.text}
              </div>
            );
          }
          // ready
          return (
            <div key={i} className="boot-line boot-ready">
              <span className="boot-tag boot-ready-tag">[ READY ]</span> {l.text}
            </div>
          );
        })}
        <div className="boot-cursor" aria-hidden>▍</div>
      </div>
      <div className="boot-skip">press any key to skip · click to dismiss</div>
    </div>
  );
}
