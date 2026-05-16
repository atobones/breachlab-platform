"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Tiny client-only component that triggers a server-component
// refresh of /battles/koth every `intervalMs` ms. No state, no DOM —
// just calls router.refresh() on a timer. The server component then
// re-renders with fresh round / king / top5 / feed.
//
// Bails when the document is hidden (tab in background) — saves both
// our DB and the client's bandwidth.

type Props = {
  intervalMs?: number;
};

export function RealtimeRefresh({ intervalMs = 3000 }: Props) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
