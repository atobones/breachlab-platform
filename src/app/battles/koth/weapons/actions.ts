"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentSession } from "@/lib/auth/session";
import { submitWeapon } from "@/lib/koth/weapons";

export async function submitWeaponAction(formData: FormData): Promise<void> {
  const { user } = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/battles/koth/weapons/submit");
  }

  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const techniqueMd = String(formData.get("technique_md") ?? "").trim();
  const exploitText = String(formData.get("exploit_text") ?? "").trim();

  const result = await submitWeapon({
    userId: user!.id,
    slug,
    title,
    techniqueMd,
    exploitText,
  });

  if (!result.ok) {
    const q = new URLSearchParams({
      error: result.error,
      slug,
      title,
      technique_md: techniqueMd,
      exploit_text: exploitText,
    });
    redirect(`/battles/koth/weapons/submit?${q.toString()}`);
  }

  revalidatePath("/battles/koth/weapons");
  redirect(`/battles/koth/weapons?submitted=${encodeURIComponent(slug)}`);
}
