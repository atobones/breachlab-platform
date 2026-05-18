"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getCurrentSession } from "@/lib/auth/session";
import { getReplayById } from "@/lib/koth/replays";
import {
  finishRaceAttempt,
  startRaceAttempt,
} from "@/lib/koth/races";

// Ghost-Race server actions.
//
// Mirror of the Daily server-action migration (PR #311): Cloudflare's
// managed bot-challenge interstitials anonymous client POSTs to
// /api/koth/* with a 403 + JS-challenge body. Server actions sidestep
// that — they POST to /_next/action/<id> with a referer and a Next-
// generated token that CF's heuristics treat as legitimate.
//
// Each action redirects to the race page on success/failure so the
// server-rendered snapshot picks up the new state on the next render.

function uuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export async function startRaceAction(formData: FormData): Promise<void> {
  const replayId = String(formData.get("replayId") ?? "");
  if (!uuidLike(replayId)) {
    redirect("/battles/koth/replays?error=bad-replay");
  }

  const replay = await getReplayById(replayId);
  if (!replay) {
    redirect("/battles/koth/replays?error=replay-not-found");
  }

  const { user } = await getCurrentSession();
  // Anonymous race starts are allowed — they fall back to self-report
  // on finish. Matches the API behavior we're replacing.
  const userId = user?.id ?? null;

  await startRaceAttempt(replayId, userId);
  revalidatePath(`/battles/koth/race/${replayId}`);
  redirect(`/battles/koth/race/${replayId}`);
}

export async function finishRaceAction(formData: FormData): Promise<void> {
  const attemptId = String(formData.get("attemptId") ?? "");
  const replayId = String(formData.get("replayId") ?? "");
  const tookCrown = formData.get("tookCrown") === "true";

  if (!uuidLike(attemptId) || !uuidLike(replayId)) {
    redirect(`/battles/koth/race/${replayId || ""}?error=bad-attempt`);
  }

  await finishRaceAttempt(attemptId, { tookCrown });
  revalidatePath(`/battles/koth/race/${replayId}`);
  redirect(`/battles/koth/race/${replayId}`);
}
