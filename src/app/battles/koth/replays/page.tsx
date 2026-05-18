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
  kind?: "session_close" | "crown_moment" | "ambient";
  path?: string;
};

export default async function ReplaysLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const replays = await listReplays({
    slot: sp.slot,
    kind: sp.kind,
    exploitPath: sp.path,
    limit: 60,
  });
  const total = await countReplays();

  return (
    <article className="space-y-6 max-w-5xl">
      <header className="space-y-2">
        <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono">
          ▸ crown wars / archive
        </div>
        <h1 className="text-amber text-2xl sm:text-3xl phosphor wordmark font-bold tracking-[0.08em]">
          REPLAYS
        </h1>
        <p className="text-[14px] leading-relaxed text-muted">
          Every KoTH session is recorded. Watch a kill chain step by step.
          Race the ghost of yesterday&apos;s king. Share the moment your
          crown landed.
        </p>
      </header>

      <section className="border border-border/40 p-3 text-[11px] font-mono">
        <div className="flex flex-wrap items-center gap-3 text-muted">
          <span className="text-amber/80 uppercase tracking-wider">
            ▸ filters
          </span>
          <FilterChip
            label="all"
            href="/battles/koth/replays"
            active={!sp.kind && !sp.slot && !sp.path}
          />
          <FilterChip
            label="👑 crown moments"
            href="/battles/koth/replays?kind=crown_moment"
            active={sp.kind === "crown_moment"}
          />
          <FilterChip
            label="▸ session closes"
            href="/battles/koth/replays?kind=session_close"
            active={sp.kind === "session_close"}
          />
          <FilterChip
            label="· ambient"
            href="/battles/koth/replays?kind=ambient"
            active={sp.kind === "ambient"}
          />
          <span className="ml-auto text-[10px] text-muted/70">
            showing {replays.length} of {total}
          </span>
        </div>
      </section>

      {replays.length === 0 ? (
        <div className="border border-border/40 p-8 text-center text-muted font-mono text-sm">
          <div className="text-amber/60 text-base mb-2">▸ empty archive</div>
          <p>
            No replays match these filters. When KoTH sessions happen,
            their casts land here automatically.
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
        <p>
          Recordings are asciinema v2 casts —{" "}
          <a
            href="/battles/koth"
            className="text-amber/80 hover:text-amber"
          >
            jump into the arena →
          </a>
        </p>
      </footer>
    </article>
  );
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  const cls = active
    ? "text-amber border-amber/60 bg-amber/[0.06]"
    : "text-muted border-border/40 hover:border-amber/40 hover:text-text";
  return (
    <a
      href={href}
      className={`inline-block border px-2 py-0.5 ${cls} transition-colors`}
    >
      {label}
    </a>
  );
}
