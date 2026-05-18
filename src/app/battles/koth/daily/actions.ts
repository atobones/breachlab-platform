"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentSession } from "@/lib/auth/session";
import {
  finishDailyAttempt,
  getOrCreateTodaySeed,
  startDailyAttempt,
  todayUtcString,
} from "@/lib/koth/daily";

// Daily Shared-Seed Solo — server actions.
//
// Why server actions instead of API fetch: Cloudflare's managed
// bot-challenge interstitials anonymous POSTs to /api/* with a 403.
// Next.js server actions are POST'd to a special action endpoint with
// referer + a Next-generated token, which CF's heuristics allow
// through. So the player-facing path uses these; the API routes stay
// for the sidecar / arena oracle use cases.

export async function startDailyAction(): Promise<void> {
  // Ensure today's seed exists (creates if first-of-day) — same as
  // the API endpoint does.
  const seed = await getOrCreateTodaySeed();
  if (!seed) {
    redirect(
      "/battles/koth/daily?error=" +
        encodeURIComponent("no daily challenge available"),
    );
  }

  const { user } = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/battles/koth/daily");
  }

  await startDailyAttempt(seed!.dayUtc, user!.id);
  revalidatePath("/battles/koth/daily");
  redirect("/battles/koth/daily");
}

export async function finishDailyAction(formData: FormData): Promise<void> {
  const { user } = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/battles/koth/daily");
  }

  const tookCrown = formData.get("tookCrown") === "true";
  const day = todayUtcString();

  // Resolve the user's attempt for today, then finish it. Same shape
  // as the API endpoint but server-only.
  const attemptId = String(formData.get("attemptId") ?? "");
  if (!attemptId) {
    redirect("/battles/koth/daily?error=missing-attempt");
  }

  await finishDailyAttempt(attemptId, { tookCrown });
  revalidatePath("/battles/koth/daily");
  redirect(`/battles/koth/daily?finished=1&day=${encodeURIComponent(day)}`);
}
