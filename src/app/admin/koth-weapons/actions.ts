"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  kothPaths,
  kothWeaponSubmissions,
  users,
} from "@/lib/db/schema";

// Approve a submission: insert a row into koth_paths under
// `<author-handle>-<primitive-slug>`, mark the submission approved,
// and link them. Slashes aren't allowed in catalog slugs (the rest of
// the catalog is dash-only), so we flatten with a dash.
//
// Rejection: just stamp the row with reviewer notes; the user can
// resubmit after iterating because the partial unique index only
// blocks duplicates of `pending`-status entries.

function flattenHandle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

export async function approveWeaponAction(formData: FormData): Promise<void> {
  const { user } = await getCurrentSession();
  if (!user || !user.isAdmin) redirect("/admin");

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/koth-weapons?error=missing-id");

  const sub = await db
    .select({
      id: kothWeaponSubmissions.id,
      userId: kothWeaponSubmissions.userId,
      slug: kothWeaponSubmissions.slug,
      title: kothWeaponSubmissions.title,
      techniqueMd: kothWeaponSubmissions.techniqueMd,
      status: kothWeaponSubmissions.status,
      username: users.username,
    })
    .from(kothWeaponSubmissions)
    .leftJoin(users, eq(users.id, kothWeaponSubmissions.userId))
    .where(eq(kothWeaponSubmissions.id, id))
    .limit(1);
  if (sub.length === 0 || sub[0].status !== "pending") {
    redirect("/admin/koth-weapons?error=not-pending");
  }
  const s = sub[0];

  const handle = flattenHandle(s.username ?? "anon");
  const catalogSlug = `${handle}-${s.slug}`;

  try {
    await db.transaction(async (tx) => {
      // Author-attributed entry. Player-submitted weapons are always
      // 'escalation' kind — the 3 'core' slots stay house-defined.
      await tx.insert(kothPaths).values({
        slug: catalogSlug,
        name: s.title,
        kind: "escalation",
        baseValue: 14,
        description: s.techniqueMd,
        authorUserId: s.userId,
        submissionId: s.id,
      });
      await tx
        .update(kothWeaponSubmissions)
        .set({
          status: "approved",
          reviewerId: user!.id,
          decidedAt: new Date(),
          approvedPathSlug: catalogSlug,
        })
        .where(eq(kothWeaponSubmissions.id, s.id));
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Catalog slug clash — extremely unlikely given handle-prefix, but
    // surface clearly so admin can pick a different name if needed.
    if (msg.includes("koth_paths_slug_unique") || msg.includes("duplicate key")) {
      redirect("/admin/koth-weapons?error=" + encodeURIComponent(`slug ${catalogSlug} already in catalog`));
    }
    redirect("/admin/koth-weapons?error=" + encodeURIComponent("approve failed"));
  }

  revalidatePath("/admin/koth-weapons");
  revalidatePath("/battles/koth/weapons");
  redirect("/admin/koth-weapons?approved=" + encodeURIComponent(catalogSlug));
}

export async function rejectWeaponAction(formData: FormData): Promise<void> {
  const { user } = await getCurrentSession();
  if (!user || !user.isAdmin) redirect("/admin");

  const id = String(formData.get("id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!id) redirect("/admin/koth-weapons?error=missing-id");
  if (notes.length < 4) {
    redirect(
      "/admin/koth-weapons?error=" +
        encodeURIComponent("rejection notes required (min 4 chars)"),
    );
  }

  await db
    .update(kothWeaponSubmissions)
    .set({
      status: "rejected",
      reviewerId: user!.id,
      reviewNotes: notes,
      decidedAt: new Date(),
    })
    .where(
      and(
        eq(kothWeaponSubmissions.id, id),
        eq(kothWeaponSubmissions.status, "pending"),
      ),
    );

  revalidatePath("/admin/koth-weapons");
  revalidatePath("/battles/koth/weapons");
  redirect("/admin/koth-weapons?rejected=" + encodeURIComponent(id));
}
