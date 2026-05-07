"use server";

import { eq, and, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireAdminWithTotp } from "@/lib/admin/guards";
import { recordAudit } from "@/lib/admin/audit";
import { getEmailClient } from "@/lib/email/client";

export type BroadcastResult =
  | { ok: true; sent: number; failed: number; total: number }
  | { ok: false; error: string };

/**
 * Send an ops-incident email blast to all email-verified users.
 *
 * Created 2026-05-07 to reach non-Discord players after the unannounced
 * Phantom/Ghost host-key rotation. General-purpose: any future ops notice
 * (downtime, key rotation announcements, etc.) can use the same path.
 *
 * Failure semantics: per-user send is best-effort. We tally success/failure
 * and write a single audit row with totals. Individual failures are logged
 * by the email client (resend log line) but don't abort the loop — one
 * bounced address shouldn't block the rest of the blast.
 */
export async function broadcastOpsEmail(
  subject: string,
  body: string,
  totpCode: string
): Promise<BroadcastResult> {
  const check = await requireAdminWithTotp(totpCode);
  if ("error" in check) return { ok: false, error: check.error };

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject || !trimmedBody) {
    return { ok: false, error: "subject and body are required" };
  }
  if (trimmedSubject.length > 200) {
    return { ok: false, error: "subject too long (max 200 chars)" };
  }
  if (trimmedBody.length > 10_000) {
    return { ok: false, error: "body too long (max 10k chars)" };
  }

  const recipients = await db
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.emailVerified, true), isNotNull(users.email)));

  const client = getEmailClient();
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    try {
      await client.send({
        to: r.email,
        subject: trimmedSubject,
        text: trimmedBody,
      });
      sent++;
    } catch (exc) {
      failed++;
      console.error(
        `[ops-broadcast] failed to=${r.email}`,
        exc instanceof Error ? exc.message : exc
      );
    }
  }

  await recordAudit({
    actor: check.actor,
    action: "ops.broadcast",
    metadata: {
      subject: trimmedSubject,
      total: recipients.length,
      sent,
      failed,
    },
  });

  return { ok: true, sent, failed, total: recipients.length };
}
