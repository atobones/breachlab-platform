"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const PATH_LABELS: Record<string, string> = {
  "/": "~",
  "/manifesto": "~/manifesto",
  "/founding": "~/founding",
  "/leaderboard": "~/leaderboard",
  "/hall-of-operatives": "~/hall",
  "/help": "~/help",
  "/rules": "~/rules",
  "/donate": "~/donate",
  "/login": "~/login",
  "/register": "~/register",
  "/dashboard": "~/dashboard",
  "/submit": "~/submit",
};

function formatPath(pathname: string): string {
  if (PATH_LABELS[pathname]) return PATH_LABELS[pathname];
  // /tracks/ghost → ~/tracks/ghost ; /tracks/ghost/level3 → ~/tracks/ghost/lvl3
  if (pathname.startsWith("/tracks/")) {
    return "~" + pathname.replace("/level", "/lvl");
  }
  if (pathname.startsWith("/u/")) {
    return "~/u/" + pathname.slice(3);
  }
  if (pathname.startsWith("/admin")) {
    return "~/admin" + pathname.slice(6);
  }
  return "~" + pathname;
}

type Props = {
  username: string | null;
  children: React.ReactNode;
};

export function TerminalWindow({ username, children }: Props) {
  const pathname = usePathname();
  const [pid, setPid] = useState<number>(0);

  useEffect(() => {
    setPid(1000 + Math.floor(Math.random() * 9000));
  }, []);

  const user = username ?? "guest";
  const cwd = formatPath(pathname);

  return (
    <div className="terminal-window">
      <div className="terminal-titlebar">
        <div className="terminal-dots" aria-hidden>
          <span className="dot dot-r" />
          <span className="dot dot-y" />
          <span className="dot dot-g" />
        </div>
        <div className="terminal-title">
          <span className="title-prompt">
            {user}@breachlab:<span className="title-cwd">{cwd}</span>$
          </span>
        </div>
        <div className="terminal-meta">
          {pid > 0 && (
            <>
              <span>pid {pid}</span>
              <span className="title-sep">·</span>
              <span>tty/0</span>
            </>
          )}
        </div>
      </div>
      <div className="terminal-content">{children}</div>
    </div>
  );
}
