import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";
import {
  listMySubmissions,
  pendingDiscoveriesForUser,
} from "@/lib/koth/weapons";

export const metadata: Metadata = {
  title: "Weapons Forge — Crown Wars — BreachLab",
  description:
    "Submit your privesc techniques to the Crown Wars catalog. Author credit forever.",
};

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  pending: "text-amber",
  approved: "text-green",
  rejected: "text-red-400",
  withdrawn: "text-muted",
};

const STATUS_GLYPH: Record<string, string> = {
  pending: "◷",
  approved: "✓",
  rejected: "✗",
  withdrawn: "—",
};

function fmtDate(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d;
  return t.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export default async function WeaponsForgePage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login?next=/battles/koth/weapons");

  const q = await searchParams;
  const [pending, mine] = await Promise.all([
    pendingDiscoveriesForUser(user!.id),
    listMySubmissions(user!.id, 50),
  ]);

  return (
    <article className="space-y-6 max-w-4xl">
      <header className="space-y-2">
        <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono flex items-center gap-3">
          <Link
            href="/battles/koth"
            className="hover:text-amber transition-colors"
          >
            ← crown wars
          </Link>
          <span className="text-muted/40">|</span>
          <span>weapons forge</span>
        </div>
        <h1 className="text-amber text-2xl sm:text-3xl phosphor wordmark font-bold tracking-[0.04em]">
          WEAPONS FORGE
        </h1>
        <p className="text-[14px] leading-relaxed text-muted max-w-3xl">
          When you take crown via a path no one else has used, the system
          flags it as a first-discovery and gives you +50 pt. The Forge
          turns that one-off into a permanent catalog entry: write up the
          technique, we sandbox-replay it, and on approval the slug enters
          the catalog as <code className="text-amber/80">{`<your-handle>/<primitive>`}</code>
          {" "}— author credit forever.
        </p>
      </header>

      {q.submitted && (
        <div className="border border-green/40 bg-green/5 text-green text-[13px] font-mono px-4 py-2">
          ✓ submission received for{" "}
          <code className="text-green/90">{q.submitted}</code>. Sandbox
          review usually lands within ~24h.
        </div>
      )}

      <section className="border border-amber/30 bg-amber/[0.03] p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="text-[10px] text-amber tracking-[0.3em] uppercase font-mono">
            ▸ ready to forge
          </div>
          <Link
            href="/battles/koth/weapons/submit"
            className="btn-bracket text-amber text-[12px] font-mono tracking-[0.18em]"
          >
            Submit a Weapon →
          </Link>
        </div>
        {pending.length === 0 ? (
          <p className="text-[12px] text-muted font-mono leading-snug">
            no unsubmitted first-discoveries on file. Take a crown via a
            slug not in the catalog and the +50 bonus will surface a
            submission CTA here.
          </p>
        ) : (
          <div className="space-y-1 font-mono text-[12px]">
            <p className="text-muted leading-snug">
              Slugs you opened in-arena that aren&apos;t in the catalog
              yet. One click to submit:
            </p>
            <div className="flex flex-wrap gap-2">
              {pending.map((slug) => (
                <Link
                  key={slug}
                  href={`/battles/koth/weapons/submit?slug=${encodeURIComponent(slug)}`}
                  className="border border-amber/40 px-2 py-0.5 text-amber/90 hover:bg-amber/[0.08] hover:border-amber transition-colors"
                >
                  {slug}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="border border-border/40">
        <div className="px-3 py-2 border-b border-border/40 bg-amber/[0.04] flex items-center justify-between">
          <div className="text-[10px] text-amber/80 tracking-[0.3em] uppercase font-mono">
            ▸ your submissions
          </div>
          <span className="text-[10px] text-muted font-mono">
            {mine.length} total
          </span>
        </div>
        {mine.length === 0 ? (
          <div className="p-6 text-center text-muted font-mono text-sm">
            No submissions yet. Take a fresh crown, then submit the
            technique.
          </div>
        ) : (
          <ul className="divide-y divide-border/30 font-mono text-[12px]">
            {mine.map((s) => (
              <li key={s.id} className="px-3 py-2 space-y-1">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`${STATUS_COLOR[s.status] ?? "text-muted"} text-[10px] tracking-widest uppercase`}
                      title={s.status}
                    >
                      {STATUS_GLYPH[s.status] ?? "·"} {s.status}
                    </span>
                    <span className="text-text">{s.title}</span>
                    <code className="text-amber/70 text-[11px]">{s.slug}</code>
                  </div>
                  <span className="text-muted text-[10px]">
                    {fmtDate(s.createdAt)}
                  </span>
                </div>
                {s.status === "approved" && s.approvedPathSlug && (
                  <div className="text-[11px] text-green/80 ml-4">
                    landed as{" "}
                    <code className="text-green">{s.approvedPathSlug}</code>{" "}
                    in the catalog.
                  </div>
                )}
                {s.status === "rejected" && s.reviewNotes && (
                  <div className="text-[11px] text-red-400/80 ml-4">
                    reviewer: {s.reviewNotes}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="pt-4 border-t border-border/40 text-[11px] text-muted font-mono leading-relaxed">
        <p>
          The Forge is the long-tail of Crown Wars. House paths are a
          starting catalog; the real game is finding root the box{" "}
          <em>doesn&apos;t know about yet</em>. Every approved weapon
          becomes a Daily-challenge candidate and a permanent receipt of
          your name in the catalog.
        </p>
      </footer>
    </article>
  );
}
