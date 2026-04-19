"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type HistoryLine =
  | { kind: "input"; cwd: string; user: string; text: string }
  | { kind: "output"; text: string }
  | { kind: "error"; text: string };

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
};

export function CommandPalette({ username }: Props) {
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
        append([
          echo,
          {
            kind: "output",
            text:
              username === null
                ? "guest (not logged in) — `cd login` or `cd register`"
                : `${username}  uid=${username}  on breachlab.org`,
          },
        ]);
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
    [append, cwd, router, user, username]
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

  if (!open) {
    return (
      <button
        className="palette-hint"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        title="Press ` to open shell"
      >
        <span className="palette-hint-key">`</span>
        <span className="palette-hint-text">shell</span>
      </button>
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
