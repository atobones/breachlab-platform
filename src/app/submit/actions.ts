"use server";

import { headers } from "next/headers";
import { getCurrentSession } from "@/lib/auth/session";
import { submitFlag } from "@/lib/tracks/submit";

type State = { ok: boolean; error: string | null; message: string | null };

export async function submitFlagAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const { user } = await getCurrentSession();
  if (!user) return { ok: false, error: "Not logged in", message: null };

  const raw = String(formData.get("flag") ?? "");
  if (!raw) return { ok: false, error: "Flag required", message: null };

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;

  const result = await submitFlag(user.id, raw, ip);
  if (!result.ok) return { ok: false, error: result.error, message: null };
  return {
    ok: true,
    error: null,
    message: `Captured ${result.trackSlug} level ${result.levelIdx} for ${result.points} pts`,
  };
}
