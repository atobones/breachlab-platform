"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentSession } from "@/lib/auth/session";
import {
  abandonDailyAttempt,
  finishDailyAttempt,
  getOrCreateTodaySeed,
  startDailyAttempt,
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

// Server-verified finish — checks the arena's koth_events for a real
// crown_taken with exploit_path == today's seed. No honor system; if
// the player hasn't actually crowned via the right primitive, this
// action leaves the attempt running and surfaces a 'not yet'
// indicator via the page's render of the attempt snapshot.
export async function finishDailyAction(formData: FormData): Promise<void> {
  const { user } = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/battles/koth/daily");
  }

  const attemptId = String(formData.get("attemptId") ?? "");
  if (!attemptId) {
    redirect("/battles/koth/daily?error=missing-attempt");
  }

  const outcome = await finishDailyAttempt(attemptId);
  revalidatePath("/battles/koth/daily");
  if (!outcome || !outcome.verified) {
    redirect("/battles/koth/daily?check=not-yet");
  }
  redirect("/battles/koth/daily");
}

// Explicit abandon — player decides to bail. Marks the attempt
// finished with tookCrown=false so it doesn't block today's slot
// indefinitely (one attempt per user per day; without this they'd be
// stuck if they ran out of time).
export async function abandonDailyAction(formData: FormData): Promise<void> {
  const { user } = await getCurrentSession();
  if (!user) {
    redirect("/login?next=/battles/koth/daily");
  }

  const attemptId = String(formData.get("attemptId") ?? "");
  if (!attemptId) {
    redirect("/battles/koth/daily?error=missing-attempt");
  }

  await abandonDailyAttempt(attemptId);
  revalidatePath("/battles/koth/daily");
  redirect("/battles/koth/daily?abandoned=1");
}
