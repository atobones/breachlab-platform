import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";
import { pendingDiscoveriesForUser } from "@/lib/koth/weapons";
import { submitWeaponAction } from "../actions";

export const metadata: Metadata = {
  title: "Forge a Weapon — Crown Wars — BreachLab",
  description:
    "Submit your privesc technique to the Crown Wars catalog. Author credit forever.",
};

export const dynamic = "force-dynamic";

type Q = {
  error?: string;
  slug?: string;
  title?: string;
  technique_md?: string;
  exploit_text?: string;
};

export default async function ForgeSubmitPage({
  searchParams,
}: {
  searchParams: Promise<Q>;
}) {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login?next=/battles/koth/weapons/submit");

  const q = await searchParams;
  const pending = await pendingDiscoveriesForUser(user!.id);

  return (
    <article className="space-y-6 max-w-3xl">
      <header className="space-y-2">
        <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono flex items-center gap-3">
          <Link
            href="/battles/koth"
            className="hover:text-amber transition-colors"
          >
            ← crown wars
          </Link>
          <span className="text-muted/40">|</span>
          <Link
            href="/battles/koth/weapons"
            className="hover:text-amber transition-colors"
          >
            forge
          </Link>
          <span className="text-muted/40">|</span>
          <span>submit</span>
        </div>
        <h1 className="text-amber text-2xl sm:text-3xl phosphor wordmark font-bold tracking-[0.04em]">
          WEAPONS FORGE · SUBMIT
        </h1>
        <p className="text-[13px] leading-relaxed text-muted max-w-2xl">
          Already opened a fresh privesc in the arena? Hand us the
          technique. After review it lands in the catalog under{" "}
          <code className="text-amber/80">{`<your-handle>/<primitive>`}</code>{" "}
          — author credit forever, picked up by Daily challenges, surfaced
          in every replay tagged with it.
        </p>
      </header>

      {q.error && (
        <div className="border border-red-400/40 bg-red-400/5 text-red-400 text-[13px] font-mono px-4 py-2">
          ✗ {q.error}
        </div>
      )}

      {pending.length > 0 && (
        <section className="border border-amber/40 bg-amber/[0.04] px-4 py-3 font-mono text-[12px] space-y-2">
          <div className="text-amber tracking-[0.18em] uppercase text-[10px]">
            ▸ your unsubmitted first-discoveries
          </div>
          <div className="flex flex-wrap gap-2">
            {pending.map((slug) => (
              <code
                key={slug}
                className="border border-amber/40 px-2 py-0.5 text-amber/90"
              >
                {slug}
              </code>
            ))}
          </div>
          <p className="text-muted text-[11px] leading-snug">
            Pick one of these for the slug field below — only paths you
            opened in-arena can be submitted.
          </p>
        </section>
      )}

      <form action={submitWeaponAction} className="space-y-5">
        <div className="space-y-1">
          <label
            htmlFor="slug"
            className="block text-[10px] text-amber/80 uppercase tracking-widest font-mono"
          >
            slug · the name you used for crown-claim
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            pattern="[a-z0-9][a-z0-9-]{1,63}"
            defaultValue={q.slug ?? ""}
            placeholder="my-fresh-privesc"
            className="w-full bg-bg border border-amber/30 px-3 py-2 text-[13px] font-mono text-text focus:outline-none focus:border-amber"
          />
          <p className="text-[10px] text-muted leading-snug">
            lowercase letters, digits, dashes. 2–64 chars. Must match a
            first-discovery you logged.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="title"
            className="block text-[10px] text-amber/80 uppercase tracking-widest font-mono"
          >
            title · short human-readable name
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            minLength={4}
            maxLength={120}
            defaultValue={q.title ?? ""}
            placeholder="e.g. PYTHONPATH override via writable site-packages"
            className="w-full bg-bg border border-amber/30 px-3 py-2 text-[13px] font-mono text-text focus:outline-none focus:border-amber"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="technique_md"
            className="block text-[10px] text-amber/80 uppercase tracking-widest font-mono"
          >
            technique · how the privesc works (1 paragraph minimum)
          </label>
          <textarea
            id="technique_md"
            name="technique_md"
            required
            minLength={1}
            maxLength={10240}
            rows={8}
            defaultValue={q.technique_md ?? ""}
            placeholder="Markdown ok. Describe the primitive, the root-cause class, and what a defender would patch to close it."
            className="w-full bg-bg border border-amber/30 px-3 py-2 text-[12px] font-mono text-text resize-y focus:outline-none focus:border-amber"
          />
          <p className="text-[10px] text-muted leading-snug">
            10240 char ceiling. Aim for 100–500 words: enough that another
            player understands the technique without watching your replay.
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="exploit_text"
            className="block text-[10px] text-amber/80 uppercase tracking-widest font-mono"
          >
            exploit · the one-shot script / one-liner
          </label>
          <textarea
            id="exploit_text"
            name="exploit_text"
            required
            minLength={1}
            maxLength={5120}
            rows={10}
            defaultValue={q.exploit_text ?? ""}
            placeholder="#!/usr/bin/env bash&#10;set -eu&#10;# your privesc here that ends with crown-claim ..."
            className="w-full bg-bg border border-amber/30 px-3 py-2 text-[12px] font-mono text-text resize-y focus:outline-none focus:border-amber"
          />
          <p className="text-[10px] text-muted leading-snug">
            5120 char ceiling. Will be sandbox-replayed in a throwaway arena
            before approval. Use only public information that&apos;s safe to
            credit you with — exploits are public after approval.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
          <Link
            href="/battles/koth/weapons"
            className="text-[12px] text-muted hover:text-amber font-mono tracking-[0.18em] uppercase"
          >
            ← cancel
          </Link>
          <button
            type="submit"
            className="btn-bracket text-amber text-[13px] font-mono tracking-[0.18em]"
          >
            Forge & Submit →
          </button>
        </div>
      </form>

      <footer className="pt-4 border-t border-border/40 text-[11px] text-muted font-mono leading-relaxed">
        <p>
          The Forge is moderated. Each submission gets sandbox-replayed
          against a throwaway arena before approval to confirm it actually
          gets root the way you describe. We&apos;ll respond within ~24h.
          Rejections come with reviewer notes — you can iterate and
          resubmit.
        </p>
      </footer>
    </article>
  );
}
