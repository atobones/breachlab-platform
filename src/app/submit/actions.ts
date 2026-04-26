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
  if (!user.emailVerified) {
    return {
      ok: false,
      error: "Verify your email before submitting flags.",
      message: null,
    };
  }

  const raw = String(formData.get("flag") ?? "");
  if (!raw) return { ok: false, error: "Flag required", message: null };

  const headerList = await headers();
  // Trust only x-real-ip (Caddy sets it from Cf-Connecting-Ip for
  // external traffic, which is the real client IP the Cloudflare edge
  // saw). x-forwarded-for is client-spoofable end-to-end so submitting
  // with a fake XFF chain used to let an attacker rotate their
  // source_ip per request; observed on the 2026-04-20 incident where
  // the submissions.source_ip column held Cloudflare edge IPs instead
  // of the real client.
  const ip = headerList.get("x-real-ip") ?? null;

  const result = await submitFlag(user.id, raw, ip);
  if (!result.ok) return { ok: false, error: result.error, message: null };
  return {
    ok: true,
    error: null,
    message: `Captured ${result.trackSlug} level ${result.levelIdx} for ${result.points} pts`,
  };
}
