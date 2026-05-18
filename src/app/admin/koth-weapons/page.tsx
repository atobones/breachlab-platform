import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { kothWeaponSubmissions, users } from "@/lib/db/schema";
import { approveWeaponAction, rejectWeaponAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin: KoTH Weapons Forge — BreachLab" };

type Status = "pending" | "approved" | "rejected" | "withdrawn";

async function fetchByStatus(status: Status, limit = 50) {
  return db
    .select({
      id: kothWeaponSubmissions.id,
      userId: kothWeaponSubmissions.userId,
      username: users.username,
      slug: kothWeaponSubmissions.slug,
      title: kothWeaponSubmissions.title,
      techniqueMd: kothWeaponSubmissions.techniqueMd,
      exploitText: kothWeaponSubmissions.exploitText,
      reviewNotes: kothWeaponSubmissions.reviewNotes,
      approvedPathSlug: kothWeaponSubmissions.approvedPathSlug,
      createdAt: kothWeaponSubmissions.createdAt,
      decidedAt: kothWeaponSubmissions.decidedAt,
    })
    .from(kothWeaponSubmissions)
    .leftJoin(users, eq(users.id, kothWeaponSubmissions.userId))
    .where(eq(kothWeaponSubmissions.status, status))
    .orderBy(desc(kothWeaponSubmissions.createdAt))
    .limit(limit);
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  const t = typeof d === "string" ? new Date(d) : d;
  return t.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export default async function AdminKothWeaponsPage({
  searchParams,
}: {
  searchParams: Promise<{
    approved?: string;
    rejected?: string;
    error?: string;
  }>;
}) {
  const q = await searchParams;
  const [pending, decided] = await Promise.all([
    fetchByStatus("pending"),
    Promise.all([fetchByStatus("approved", 20), fetchByStatus("rejected", 20)]).then(
      ([a, r]) => [...a, ...r].sort((x, y) => {
        const ax = (x.decidedAt ?? new Date(0)).valueOf();
        const ay = (y.decidedAt ?? new Date(0)).valueOf();
        return ay - ax;
      }),
    ),
  ]);

  return (
    <article className="space-y-6 max-w-4xl">
      <header className="space-y-1">
        <h1 className="text-amber text-2xl phosphor">KoTH Weapons Forge</h1>
        <p className="text-xs text-muted font-mono">
          Approved submissions land in koth_paths under{" "}
          <code>{`<handle>-<primitive>`}</code> with author credit.
        </p>
      </header>

      {q.approved && (
        <div className="border border-green/40 bg-green/5 text-green text-[13px] font-mono px-4 py-2">
          ✓ approved → catalog slug{" "}
          <code className="text-green/90">{q.approved}</code>
        </div>
      )}
      {q.rejected && (
        <div className="border border-red-400/40 bg-red-400/5 text-red-400 text-[13px] font-mono px-4 py-2">
          ✗ rejected — {q.rejected}
        </div>
      )}
      {q.error && (
        <div className="border border-amber/40 bg-amber/5 text-amber text-[13px] font-mono px-4 py-2">
          ⚠ {q.error}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-amber text-sm font-mono tracking-[0.18em] uppercase">
          ▸ pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">Queue is empty.</p>
        ) : (
          <ul className="space-y-4">
            {pending.map((s) => (
              <li
                key={s.id}
                className="border border-amber/30 bg-amber/[0.02] p-4 space-y-3"
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="text-sm font-mono">
                    <span className="text-amber">{s.title}</span>{" "}
                    <code className="text-amber/70 text-[12px]">
                      {s.slug}
                    </code>
                  </div>
                  <span className="text-[11px] text-muted">
                    by <span className="text-text">{s.username ?? "?"}</span> ·{" "}
                    {fmtDate(s.createdAt)}
                  </span>
                </div>

                <details className="text-[12px] font-mono">
                  <summary className="cursor-pointer text-amber/80 hover:text-amber select-none py-0.5 tracking-wider">
                    ▸ technique writeup
                  </summary>
                  <pre className="text-[11px] text-text bg-bg/60 border border-border/40 px-3 py-2 mt-1 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {s.techniqueMd}
                  </pre>
                </details>

                <details className="text-[12px] font-mono">
                  <summary className="cursor-pointer text-amber/80 hover:text-amber select-none py-0.5 tracking-wider">
                    ▸ exploit text
                  </summary>
                  <pre className="text-[11px] text-text bg-bg/60 border border-border/40 px-3 py-2 mt-1 whitespace-pre overflow-x-auto">
                    {s.exploitText}
                  </pre>
                </details>

                <div className="flex flex-wrap gap-3 pt-2 border-t border-border/30">
                  <form action={approveWeaponAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="btn-bracket text-green text-[12px] font-mono tracking-[0.18em]"
                    >
                      Approve → catalog
                    </button>
                  </form>
                  <form
                    action={rejectWeaponAction}
                    className="flex gap-2 items-center flex-1 min-w-[260px]"
                  >
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      type="text"
                      name="notes"
                      required
                      minLength={4}
                      placeholder="reviewer notes (sent to author)"
                      className="flex-1 bg-bg border border-red-400/30 px-2 py-1 text-[12px] font-mono text-text focus:outline-none focus:border-red-400"
                    />
                    <button
                      type="submit"
                      className="btn-bracket text-red-400 text-[12px] font-mono tracking-[0.18em]"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-sm font-mono tracking-[0.18em] uppercase">
          ▸ recently decided
        </h2>
        {decided.length === 0 ? (
          <p className="text-sm text-muted">No decisions yet.</p>
        ) : (
          <ul className="divide-y divide-border/30 font-mono text-[12px] border border-border/40">
            {decided.map((s) => (
              <li
                key={s.id}
                className="px-3 py-2 flex items-baseline justify-between gap-3 flex-wrap"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-text">{s.title}</span>
                  <code className="text-amber/70">{s.slug}</code>
                  <span className="text-muted">·</span>
                  <span className="text-muted text-[11px]">
                    by {s.username ?? "?"}
                  </span>
                  {s.approvedPathSlug && (
                    <>
                      <span className="text-muted">→</span>
                      <code className="text-green">{s.approvedPathSlug}</code>
                    </>
                  )}
                  {s.reviewNotes && (
                    <span className="text-red-400/80 text-[11px] italic">
                      ✗ {s.reviewNotes}
                    </span>
                  )}
                </div>
                <span className="text-muted text-[10px]">
                  {fmtDate(s.decidedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
