import { Metadata } from "next";

import { listReplays, countReplays } from "@/lib/koth/replays";
import { ReplayCard } from "@/components/koth/ReplayCard";

export const metadata: Metadata = {
  title: "Crown Wars Replays — BreachLab",
  description:
    "Every Crown Wars session is recorded. Browse, watch, race the ghost.",
};

// Server-rendered library page — terminals are public-by-design, so
// no auth gate. Anonymous viewers see the same content as logged-in
// operators. Filtering UI is client-driven via URL search params.
export const dynamic = "force-dynamic"; // always fresh — replays are appendend live

type Search = {
  slot?: string;
  path?: string;
};

export default async function ReplaysLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  // Only crown_moment replays are surfaced publicly — the listReplays
  // boundary enforces this. session_close and ambient stay in the DB
  // for anti-cheat / forensic use only.
  const replays = await listReplays({
    slot: sp.slot,
    exploitPath: sp.path,
    limit: 60,
  });
  const total = await countReplays();

  return (
    <article className="space-y-6 max-w-5xl">
      <header className="space-y-2">
        <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono">
          ▸ crown wars / archive · crown moments only
        </div>
        <h1 className="text-amber text-2xl sm:text-3xl phosphor wordmark font-bold tracking-[0.08em]">
          REPLAYS
        </h1>
        <p className="text-[12px] text-muted font-mono leading-snug">
          Every kill that took the crown — step-by-step. Browse to learn
          how operators chained primitives, dodged the Guard, and held
          the throne. Sessions that didn&apos;t end in a crown aren&apos;t
          published.
        </p>
      </header>

      <section className="border border-border/40 px-3 py-2 text-[11px] font-mono text-muted flex items-center justify-between">
        <span className="uppercase tracking-wider text-amber/80">
          👑 crown moments
        </span>
        <span className="text-[10px] text-muted/70">
          showing {replays.length} of {total}
        </span>
      </section>

      {replays.length === 0 ? (
        <div className="border border-border/40 p-8 text-center text-muted font-mono text-sm">
          <div className="text-amber/60 text-base mb-2">▸ empty archive</div>
          <p>
            No crown moments yet. When someone takes the throne, their
            transcript lands here automatically.
          </p>
        </div>
      ) : (
        <section className="space-y-2">
          {replays.map((r) => (
            <ReplayCard key={r.id} replay={r} />
          ))}
        </section>
      )}

      <footer className="pt-4 border-t border-border/40 text-[11px] text-muted font-mono">
        <a
          href="/battles/koth"
          className="text-amber/80 hover:text-amber"
        >
          ▸ jump into the arena
        </a>
      </footer>
    </article>
  );
}
