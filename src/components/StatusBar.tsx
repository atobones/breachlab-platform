"use client";

import { useEffect, useState } from "react";

function fmtUptime(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export function StatusBar() {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const utc = new Date(now).toISOString().slice(11, 19);

  return (
    <div className="statusbar" role="status" aria-label="System status">
      <span className="tag">BL</span>
      <span className="seg seg-tty">tty/breachlab.org</span>
      <span className="sep seg-tty">▌</span>
      <span className="seg seg-session">session {fmtUptime(now - start)}</span>
      <span className="sep seg-session">▌</span>
      <span className="seg">utc {utc}</span>
      <span className="sep seg-quip">▌</span>
      <span className="seg seg-quip text-amber">/dev/null is full</span>
      <span className="ml-auto seg text-green">
        <span className="pulse-dot">●</span> link up
      </span>
    </div>
  );
}
