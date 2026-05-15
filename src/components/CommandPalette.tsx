"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  shellB32DecodeToHex,
  shellReverse,
  shellRot13,
  shellSha256,
} from "@/lib/specter-sovereign/shell-tools";
import {
  LISTEN_PROTOCOL,
  vignetteSovereign,
  vignetteMysterySolved,
  vignetteRejected,
  vignetteCooldown,
  vignetteCapped,
  BRIEF_SOVEREIGN,
  BRIEF_MYSTERY_SOLVED,
} from "@/lib/specter-sovereign/vignettes";

type HistoryLine =
  | { kind: "input"; cwd: string; user: string; text: string }
  | { kind: "output"; text: string }
  | { kind: "error"; text: string };

export type SovereignClientContext = {
  hasSpecterCert: boolean;
  mySovereignRank: number | null;
  claimedGlobally: boolean;
  sovereignUsername: string | null;
  sovereignClaimedAt: string | null;
};

const ROUTES: { path: string; alias?: string[]; desc: string }[] = [
  { path: "/", alias: ["home", "~"], desc: "homepage" },
  { path: "/manifesto", alias: ["manifesto"], desc: "the manifesto" },
  { path: "/founding", alias: ["founding"], desc: "founding operatives roster" },
  { path: "/leaderboard", alias: ["leaderboard", "lb"], desc: "global leaderboard" },
  { path: "/hall-of-operatives", alias: ["hall"], desc: "hall of operatives (sponsors)" },
  { path: "/help", alias: ["help-page"], desc: "help page" },
  { path: "/rules", alias: ["rules"], desc: "rules of engagement" },
  { path: "/donate", alias: ["donate"], desc: "support the project" },
  { path: "/login", alias: ["login"], desc: "log in" },
  { path: "/register", alias: ["register", "signup"], desc: "create an account" },
  { path: "/dashboard", alias: ["dashboard"], desc: "your operator dashboard" },
  { path: "/submit", alias: ["submit-page"], desc: "submit a flag (page)" },
  { path: "/tracks/ghost", alias: ["ghost"], desc: "Ghost track" },
  { path: "/tracks/phantom", alias: ["phantom"], desc: "Phantom track" },
  { path: "/tracks/specter", alias: ["specter"], desc: "Specter track (soon)" },
  { path: "/tracks/mirage", alias: ["mirage"], desc: "Mirage track (planned)" },
  { path: "/tracks/cipher", alias: ["cipher"], desc: "Cipher track (planned)" },
  { path: "/tracks/nexus", alias: ["nexus"], desc: "Nexus track (planned)" },
  { path: "/tracks/oracle", alias: ["oracle"], desc: "Oracle track (planned)" },
  { path: "/tracks/wraith", alias: ["wraith"], desc: "Wraith track (planned)" },
  { path: "/tracks/shadow", alias: ["shadow"], desc: "Shadow track (planned)" },
  { path: "/tracks/sentinel", alias: ["sentinel"], desc: "Sentinel track (planned)" },
  { path: "/tracks/prism"   , alias: ["prism"], desc: "Prism track (planned)" },
  { path: "/tracks/venom", alias: ["venom"], desc: "Venom track (planned)" },
  { path: "/tracks/flux", alias: ["flux"], desc: "Flux track (planned)" },
];

const COMMANDS = [
  { name: "help", desc: "show this list" },
  { name: "cd <path>", desc: "navigate to a path (cd manifesto, cd /tracks/ghost)" },
  { name: "ls", desc: "list available routes" },
  { name: "pwd", desc: "print current path" },
  { name: "whoami", desc: "show current user" },
  { name: "tracks", desc: "list all tracks" },
  { name: "submit <flag>", desc: "go to submission page (with flag prefilled)" },
  { name: "b32 -d <s>", desc: "RFC 4648 base32 decode → hex" },
  { name: "rev <s>", desc: "reverse a string" },
  { name: "rot13 <s>", desc: "ROT13 letter substitution" },
  { name: "sha256 <s>", desc: "SHA-256 digest of input (hex)" },
  { name: "clear / cls", desc: "clear the buffer" },
  { name: "exit / quit", desc: "close the prompt (or press Esc)" },
];

function resolvePath(input: string): string | null {
  const t = input.trim().replace(/^~/, "");
  if (t === "" || t === "/") return "/";
  for (const r of ROUTES) {
    if (r.path === t || r.path === `/${t}`) return r.path;
    if (r.alias?.includes(t.replace(/^\//, ""))) return r.path;
  }
  // Try /tracks/<slug>/levelN style
  if (/^\/?tracks\/[a-z]+\/(?:level)?\d+$/.test(t)) {
    return ("/" + t.replace(/^\//, "")).replace(/\/(\d+)$/, "/level$1");
  }
  // Anything else starting with / — let router try, browser will 404 if not real
  if (t.startsWith("/")) return t;
  return null;
}

type Props = {
  username: string | null;
  sovereignContext?: SovereignClientContext;
};

const EMPTY_SOVEREIGN: SovereignClientContext = {
  hasSpecterCert: false,
  mySovereignRank: null,
  claimedGlobally: false,
  sovereignUsername: null,
  sovereignClaimedAt: null,
};

export function CommandPalette({ username, sovereignContext }: Props) {
  const sovCtx = sovereignContext ?? EMPTY_SOVEREIGN;
  // Local override so the brief unlocks IMMEDIATELY after a successful
  // seal without a page reload (the server context was fetched at
  // request time and won't have the just-recorded rank).
  const [unlockedRank, setUnlockedRank] = useState<number | null>(null);
  const effectiveRank = sovCtx.mySovereignRank ?? unlockedRank;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryLine[]>([]);
  const [recallIdx, setRecallIdx] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<HTMLDivElement>(null);

  const user = username ?? "guest";
  const cwd = pathname === "/" ? "~" : "~" + pathname;

  // Global keybind: ` (backtick) toggles open. Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inForm =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (e.key === "`" && !inForm) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    bufferRef.current?.scrollTo(0, bufferRef.current.scrollHeight);
  }, [history]);

  const append = useCallback((lines: HistoryLine[]) => {
    setHistory((h) => [...h, ...lines].slice(-200));
  }, []);

  const appendLines = useCallback(
    (texts: string[]) => {
      append(texts.map((t) => ({ kind: "output" as const, text: t })));
    },
    [append],
  );

  const submitSeal = useCallback(
    async (
      key: string,
    ): Promise<{
      ok: boolean;
      sovereign?: boolean;
      rank?: number;
      sovereignUsername?: string;
      sovereignClaimedAt?: string;
      reason?: string;
      attemptsLeft?: number;
      secondsLeft?: number;
    }> => {
      try {
        const r = await fetch("/api/specter-sovereign/seal", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ key }),
        });
        return await r.json();
      } catch {
        return { ok: false, reason: "network" };
      }
    },
    [],
  );

  const run = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (text === "") return;
      const echo: HistoryLine = { kind: "input", cwd, user, text };
      const [cmd, ...args] = text.split(/\s+/);
      const arg = args.join(" ");

      if (cmd === "clear" || cmd === "cls") {
        setHistory([]);
        return;
      }
      if (cmd === "exit" || cmd === "quit") {
        append([echo]);
        setOpen(false);
        return;
      }
      if (cmd === "help" || cmd === "?") {
        append([
          echo,
          { kind: "output", text: "available commands:" },
          ...COMMANDS.map((c) => ({
            kind: "output" as const,
            text: `  ${c.name.padEnd(18)} ${c.desc}`,
          })),
          { kind: "output", text: "" },
          { kind: "output", text: "press \\` to toggle, Esc to close, ↑/↓ for history" },
        ]);
        return;
      }
      if (cmd === "pwd") {
        append([echo, { kind: "output", text: cwd }]);
        return;
      }
      if (cmd === "whoami") {
        const lines: HistoryLine[] = [
          echo,
          {
            kind: "output",
            text:
              username === null
                ? "guest (not logged in) — `cd login` or `cd register`"
                : `${username}  uid=${username}  on breachlab.org`,
          },
        ];
        // Hidden trigger: Specter Analyst cert-holders see a subtle
        // hum-line that nudges them toward the meta-game. Nobody else
        // sees this. Stops appearing once they're on the ledger.
        if (
          sovCtx.hasSpecterCert &&
          effectiveRank === null
        ) {
          lines.push({ kind: "output", text: "" });
          lines.push({
            kind: "output",
            text: "      . . a hum from the shell . .",
          });
          lines.push({
            kind: "output",
            text: "      ‹ try listen ›",
          });
        }
        append(lines);
        return;
      }
      if (cmd === "ls") {
        append([
          echo,
          ...ROUTES.map((r) => ({
            kind: "output" as const,
            text: `  ${r.path.padEnd(28)} ${r.desc}`,
          })),
        ]);
        return;
      }
      if (cmd === "tracks") {
        const trackRoutes = ROUTES.filter((r) => r.path.startsWith("/tracks/"));
        append([
          echo,
          ...trackRoutes.map((r) => ({
            kind: "output" as const,
            text: `  ${r.path.padEnd(28)} ${r.desc}`,
          })),
        ]);
        return;
      }
      if (cmd === "submit") {
        const flag = arg.trim();
        if (!flag) {
          append([echo, { kind: "error", text: "usage: submit <flag>" }]);
          return;
        }
        append([echo, { kind: "output", text: `routing to /submit with flag prefilled...` }]);
        router.push(`/submit?flag=${encodeURIComponent(flag)}`);
        setOpen(false);
        return;
      }

      // ─── Crypto tools (Specter Sovereign meta-game enablers, but
      //     useful generally for any decoding work) ────────────────
      if (cmd === "b32") {
        // Support `b32 -d <s>` (decode) and bare `b32 <s>` (default to decode).
        const parts = args.filter((a) => a.length > 0);
        let decode = true;
        let payload = "";
        if (parts[0] === "-d") {
          decode = true;
          payload = parts.slice(1).join("");
        } else if (parts[0] === "-e") {
          decode = false;
          payload = parts.slice(1).join("");
        } else {
          payload = parts.join("");
        }
        if (!payload) {
          append([echo, { kind: "error", text: "usage: b32 [-d|-e] <string>" }]);
          return;
        }
        if (decode) {
          try {
            append([echo, { kind: "output", text: shellB32DecodeToHex(payload) }]);
          } catch (e) {
            append([
              echo,
              { kind: "error", text: e instanceof Error ? e.message : "b32: decode failed" },
            ]);
          }
        } else {
          append([echo, { kind: "error", text: "b32 -e (encode) not implemented yet" }]);
        }
        return;
      }
      if (cmd === "rev") {
        if (!arg) {
          append([echo, { kind: "error", text: "usage: rev <string>" }]);
          return;
        }
        append([echo, { kind: "output", text: shellReverse(arg) }]);
        return;
      }
      if (cmd === "rot13") {
        if (!arg) {
          append([echo, { kind: "error", text: "usage: rot13 <string>" }]);
          return;
        }
        append([echo, { kind: "output", text: shellRot13(arg) }]);
        return;
      }
      if (cmd === "sha256") {
        if (!arg) {
          append([echo, { kind: "error", text: "usage: sha256 <string>" }]);
          return;
        }
        // Async — echo placeholder, then result.
        append([echo, { kind: "output", text: "computing..." }]);
        void shellSha256(arg).then((hex) => {
          // Replace last "computing..." line with result.
          setHistory((h) => {
            const last = h[h.length - 1];
            if (last?.kind === "output" && last.text === "computing...") {
              return [...h.slice(0, -1), { kind: "output", text: hex }];
            }
            return [...h, { kind: "output", text: hex }];
          });
        });
        return;
      }

      // ─── Specter Sovereign meta-game commands (hidden) ──────────
      if (cmd === "listen") {
        if (!sovCtx.hasSpecterCert) {
          // No special response — fall through to "command not found"
          // so non-cert-holders don't learn anything from probing.
          append([echo, { kind: "error", text: `bash: ${cmd}: command not found  (try \`help\`)` }]);
          return;
        }
        append([echo, ...LISTEN_PROTOCOL.split("\n").map((t) => ({ kind: "output" as const, text: t }))]);
        return;
      }
      if (cmd === "seal") {
        if (!sovCtx.hasSpecterCert) {
          append([echo, { kind: "error", text: `bash: ${cmd}: command not found  (try \`help\`)` }]);
          return;
        }
        const key = arg.trim().toLowerCase();
        if (!/^[0-9a-f]{16}$/.test(key)) {
          append([
            echo,
            { kind: "error", text: "usage: seal <16-char-hex-key>" },
          ]);
          return;
        }
        append([echo, { kind: "output", text: "   the gate hums ..." }]);
        void submitSeal(key).then((res) => {
          if (res.ok && res.sovereign) {
            setUnlockedRank(1);
            appendLines(vignetteSovereign().split("\n"));
          } else if (res.ok) {
            setUnlockedRank(res.rank ?? 2);
            appendLines(
              vignetteMysterySolved(
                res.rank ?? 2,
                res.sovereignUsername ?? "unknown",
                res.sovereignClaimedAt
                  ? new Date(res.sovereignClaimedAt).toISOString().replace("T", " ").slice(0, 19) + " UTC"
                  : "earlier",
              ).split("\n"),
            );
          } else if (res.reason === "cooldown" && res.secondsLeft) {
            appendLines(vignetteCooldown(res.secondsLeft).split("\n"));
          } else if (res.reason === "capped") {
            appendLines(vignetteCapped().split("\n"));
          } else if (res.reason === "rejected") {
            appendLines(vignetteRejected(res.attemptsLeft ?? 0).split("\n"));
          } else {
            appendLines([
              "   the gate refuses. try again.",
            ]);
          }
        });
        return;
      }
      if (cmd === "brief") {
        if (effectiveRank === null) {
          append([echo, { kind: "error", text: `bash: ${cmd}: command not found  (try \`help\`)` }]);
          return;
        }
        const text =
          effectiveRank === 1 ? BRIEF_SOVEREIGN : BRIEF_MYSTERY_SOLVED;
        append([echo, ...text.split("\n").map((t) => ({ kind: "output" as const, text: t }))]);
        return;
      }
      if (cmd === "cd" || cmd === "open") {
        const target = resolvePath(arg || "/");
        if (!target) {
          append([echo, { kind: "error", text: `cd: no such location: ${arg}` }]);
          return;
        }
        append([echo, { kind: "output", text: `cd ${target}` }]);
        router.push(target);
        setOpen(false);
        return;
      }

      // Bare path or alias?
      const target = resolvePath(text);
      if (target) {
        append([echo, { kind: "output", text: `cd ${target}` }]);
        router.push(target);
        setOpen(false);
        return;
      }

      append([
        echo,
        {
          kind: "error",
          text: `bash: ${cmd}: command not found  (try \`help\`)`,
        },
      ]);
    },
    [
      append,
      appendLines,
      cwd,
      effectiveRank,
      router,
      sovCtx,
      submitSeal,
      user,
      username,
    ]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(input);
    setInput("");
    setRecallIdx(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const inputs = history.filter((h) => h.kind === "input");
      if (inputs.length === 0) return;
      const next = recallIdx < inputs.length - 1 ? recallIdx + 1 : recallIdx;
      setRecallIdx(next);
      const recalled = inputs[inputs.length - 1 - next];
      if (recalled && recalled.kind === "input") setInput(recalled.text);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const inputs = history.filter((h) => h.kind === "input");
      const next = recallIdx > 0 ? recallIdx - 1 : -1;
      setRecallIdx(next);
      if (next === -1) setInput("");
      else {
        const recalled = inputs[inputs.length - 1 - next];
        if (recalled && recalled.kind === "input") setInput(recalled.text);
      }
    }
  };

  // Once a Sovereign has been claimed globally, the haze leaves the
  // shell button and lives on the Sovereign's name instead. We render
  // the smoke SVGs only when the gate is still open.
  const showHaze = !sovCtx.claimedGlobally;

  if (!open) {
    return (
      <div className="palette-hint-shell">
        {/* Layer A — primary smoke halo. Solid green ellipse run
            through heavy turbulence so the EDGES shred into wispy
            smoke; dense center sits behind the button (button bg
            masks it), wispy edges escape past button perimeter. */}
        {showHaze && (
        <>
        <svg
          className="smoke-field smoke-field-a"
          viewBox="0 0 220 110"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <filter
              id="bl-smoke-shred-a"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.014 0.022"
                numOctaves={4}
                seed={3}
                result="n"
              >
                <animate
                  attributeName="baseFrequency"
                  dur="38s"
                  calcMode="spline"
                  values="0.014 0.022; 0.013 0.023; 0.015 0.021; 0.014 0.022"
                  keyTimes="0; 0.33; 0.66; 1"
                  keySplines="0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="n"
                scale={55}
                xChannelSelector="R"
                yChannelSelector="G"
              >
                <animate
                  attributeName="scale"
                  dur="45s"
                  calcMode="spline"
                  values="55; 62; 50; 55"
                  keyTimes="0; 0.33; 0.66; 1"
                  keySplines="0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1"
                  repeatCount="indefinite"
                />
              </feDisplacementMap>
              <feGaussianBlur stdDeviation={5} />
            </filter>
            <radialGradient id="bl-smoke-grad-a" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.85" />
              <stop offset="35%" stopColor="#22c55e" stopOpacity="0.70" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.40" />
              <stop offset="80%" stopColor="#00ff88" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse
            cx={110}
            cy={55}
            rx={100}
            ry={48}
            fill="url(#bl-smoke-grad-a)"
            filter="url(#bl-smoke-shred-a)"
          />
        </svg>

        {/* Layer B — smaller, paler, OFFSET timing.  When layer A is
            mid-loop, layer B is at boundary; together they read as
            one continuously evolving volume. */}
        <svg
          className="smoke-field smoke-field-b"
          viewBox="0 0 180 95"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <filter
              id="bl-smoke-shred-b"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.018 0.026"
                numOctaves={3}
                seed={11}
                result="n"
              >
                <animate
                  attributeName="baseFrequency"
                  dur="51s"
                  calcMode="spline"
                  values="0.018 0.026; 0.019 0.024; 0.017 0.027; 0.018 0.026"
                  keyTimes="0; 0.33; 0.66; 1"
                  keySplines="0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="n"
                scale={42}
                xChannelSelector="R"
                yChannelSelector="G"
              >
                <animate
                  attributeName="scale"
                  dur="58s"
                  calcMode="spline"
                  values="42; 48; 38; 42"
                  keyTimes="0; 0.33; 0.66; 1"
                  keySplines="0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1"
                  repeatCount="indefinite"
                />
              </feDisplacementMap>
              <feGaussianBlur stdDeviation={4} />
            </filter>
            <radialGradient id="bl-smoke-grad-b" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#b9f8d4" stopOpacity="0.65" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.45" />
              <stop offset="65%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="85%" stopColor="#00ff88" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse
            cx={90}
            cy={47}
            rx={82}
            ry={40}
            fill="url(#bl-smoke-grad-b)"
            filter="url(#bl-smoke-shred-b)"
          />
        </svg>

        {/* RISING STREAMS — 3 thin elongated plumes that drift up
            from the button top edge.  Adds directional flow on top
            of the ambient halo so smoke clearly "leaks from button"
            instead of just hovering symmetrically. */}
        <svg
          className="stream stream-mid"
          viewBox="0 0 60 110"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <filter
              id="bl-stream-mid"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.020 0.015"
                numOctaves={3}
                seed={7}
                result="n"
              >
                <animate
                  attributeName="baseFrequency"
                  dur="22s"
                  calcMode="spline"
                  values="0.020 0.015; 0.022 0.014; 0.018 0.016; 0.020 0.015"
                  keyTimes="0; 0.33; 0.66; 1"
                  keySplines="0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="n" scale={38} xChannelSelector="R" yChannelSelector="G" />
              <feGaussianBlur stdDeviation={4} />
            </filter>
            <radialGradient id="bl-stream-grad-mid" cx="50%" cy="65%" r="55%">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.80" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.55" />
              <stop offset="75%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx={30} cy={70} rx={25} ry={35} fill="url(#bl-stream-grad-mid)" filter="url(#bl-stream-mid)" />
        </svg>

        <svg
          className="stream stream-left"
          viewBox="0 0 60 110"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <filter
              id="bl-stream-lt"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.024 0.014"
                numOctaves={3}
                seed={13}
                result="n"
              >
                <animate
                  attributeName="baseFrequency"
                  dur="26s"
                  calcMode="spline"
                  values="0.024 0.014; 0.022 0.016; 0.026 0.013; 0.024 0.014"
                  keyTimes="0; 0.33; 0.66; 1"
                  keySplines="0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="n" scale={40} xChannelSelector="R" yChannelSelector="G" />
              <feGaussianBlur stdDeviation={4} />
            </filter>
            <radialGradient id="bl-stream-grad-lt" cx="50%" cy="65%" r="55%">
              <stop offset="0%" stopColor="#b9f8d4" stopOpacity="0.65" />
              <stop offset="40%" stopColor="#22c55e" stopOpacity="0.45" />
              <stop offset="75%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx={30} cy={70} rx={25} ry={35} fill="url(#bl-stream-grad-lt)" filter="url(#bl-stream-lt)" />
        </svg>

        <svg
          className="stream stream-right"
          viewBox="0 0 60 110"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <filter
              id="bl-stream-rt"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.018 0.016"
                numOctaves={3}
                seed={19}
                result="n"
              >
                <animate
                  attributeName="baseFrequency"
                  dur="29s"
                  calcMode="spline"
                  values="0.018 0.016; 0.020 0.014; 0.016 0.018; 0.018 0.016"
                  keyTimes="0; 0.33; 0.66; 1"
                  keySplines="0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="n" scale={36} xChannelSelector="R" yChannelSelector="G" />
              <feGaussianBlur stdDeviation={4} />
            </filter>
            <radialGradient id="bl-stream-grad-rt" cx="50%" cy="65%" r="55%">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.75" />
              <stop offset="40%" stopColor="#10b981" stopOpacity="0.50" />
              <stop offset="75%" stopColor="#22c55e" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx={30} cy={70} rx={25} ry={35} fill="url(#bl-stream-grad-rt)" filter="url(#bl-stream-rt)" />
        </svg>
        </>
        )}

        <button
          className="palette-hint"
          onClick={() => setOpen(true)}
          aria-label="Open command palette"
          title="Press ` to open shell"
        >
          <span className="palette-hint-key">`</span>
          <span className="palette-hint-text">shell</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="palette-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="palette-window">
        <div className="palette-titlebar">
          <span className="palette-tag">[BL]</span>
          <span className="palette-title">interactive shell</span>
          <span className="palette-meta">press Esc to close · ↑/↓ history</span>
        </div>
        <div className="palette-buffer" ref={bufferRef}>
          {history.length === 0 && (
            <div className="palette-welcome">
              BreachLab interactive shell.  Type <code>help</code> for commands, or try{" "}
              <code>cd manifesto</code>, <code>tracks</code>, <code>whoami</code>.
            </div>
          )}
          {history.map((h, i) => {
            if (h.kind === "input") {
              return (
                <div key={i} className="palette-line palette-input-echo">
                  <span className="palette-prompt">
                    {h.user}@breachlab:<span className="palette-cwd">{h.cwd}</span>$
                  </span>{" "}
                  <span>{h.text}</span>
                </div>
              );
            }
            if (h.kind === "error") {
              return (
                <div key={i} className="palette-line palette-error">
                  {h.text}
                </div>
              );
            }
            return (
              <div key={i} className="palette-line palette-output">
                {h.text === "" ? "\u00A0" : h.text}
              </div>
            );
          })}
        </div>
        <form className="palette-inputrow" onSubmit={onSubmit}>
          <span className="palette-prompt">
            {user}@breachlab:<span className="palette-cwd">{cwd}</span>$
          </span>
          <input
            ref={inputRef}
            className="palette-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            aria-label="Command input"
          />
        </form>
      </div>
    </div>
  );
}
