"use server";

import { db } from "@/lib/db/client";
import { specterPlayerTokens } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";
import { generateToken, hashToken } from "@/lib/auth/tokens";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Server Action sibling of /api/specter/issue-token. Same DB write, but
// invoked via Next's RSC channel instead of a /api fetch — Cloudflare's
// Bot Fight Mode was challenging the bare cookie POST to /api/specter/*
// with a "Just a moment…" interstitial that returned 403 to the browser
// XHR. Server Actions ride on the framework's own POST endpoint with
// Next-supplied headers + CSRF token, which CF has been observed not to
// challenge. Keep the /api route too (used by external CLIs and as a
// fallback).
export type IssueTokenResult =
  | { ok: true; token: string; expiresAt: string }
  | { ok: false; error: string };

export async function issueSpecterTokenAction(): Promise<IssueTokenResult> {
  const { user } = await getCurrentSession();
  if (!user) return { ok: false, error: "not authenticated" };

  const token = generateToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.insert(specterPlayerTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return { ok: true, token, expiresAt: expiresAt.toISOString() };
}
