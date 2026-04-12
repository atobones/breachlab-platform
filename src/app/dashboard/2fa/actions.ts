"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";
import { generateTotpSecret, totpUri, verifyTotp } from "@/lib/auth/totp";
import QRCode from "qrcode";

type EnableState = {
  secret: string | null;
  qrDataUrl: string | null;
  error: string | null;
  done: boolean;
};

export async function startEnable2faAction(): Promise<EnableState> {
  const { user } = await getCurrentSession();
  if (!user) {
    return { secret: null, qrDataUrl: null, error: "Not logged in", done: false };
  }
  if (!user.emailVerified) {
    return {
      secret: null,
      qrDataUrl: null,
      error: "Verify your email before enabling 2FA",
      done: false,
    };
  }
  const secret = generateTotpSecret();
  const uri = totpUri(user.username, secret);
  const qrDataUrl = await QRCode.toDataURL(uri);
  return { secret, qrDataUrl, error: null, done: false };
}

export async function confirmEnable2faAction(
  _prev: EnableState,
  formData: FormData
): Promise<EnableState> {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");

  const secret = String(formData.get("secret") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!secret || !/^\d{6}$/.test(code)) {
    return { secret, qrDataUrl: null, error: "Invalid input", done: false };
  }
  if (!(await verifyTotp(secret, code))) {
    return { secret, qrDataUrl: null, error: "Code did not match", done: false };
  }
  await db.update(users).set({ totpSecret: secret }).where(eq(users.id, user.id));
  return { secret: null, qrDataUrl: null, error: null, done: true };
}
