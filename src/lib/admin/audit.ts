import { headers } from "next/headers";
import { db } from "@/lib/db/client";
import { adminAuditLog } from "@/lib/db/schema";

// Enumerated so adding a new audited action forces a type change here and
// not in the calling code.
export type AuditAction =
  | "user.promote"
  | "user.demote"
  | "user.reset_totp"
  | "user.force_email_reverify"
  | "user.logout_all_sessions"
  | "self.logout_all_sessions"
  | "sponsor.end"
  | "sponsor.delete"
  | "speedrun.approve"
  | "speedrun.reject";

type WriteParams = {
  actor: { id: string; username: string };
  action: AuditAction;
  targetUserId?: string;
  targetSponsorId?: string;
  metadata?: Record<string, unknown>;
};

export async function recordAudit(params: WriteParams): Promise<void> {
  let ip: string | null = null;
  try {
    const h = await headers();
    ip =
      h.get("x-real-ip") ??
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
  } catch {
    // Not in a request context (e.g. background job) — leave ip null.
  }
  try {
    await db.insert(adminAuditLog).values({
      actorId: params.actor.id,
      actorUsername: params.actor.username,
      action: params.action,
      targetUserId: params.targetUserId ?? null,
      targetSponsorId: params.targetSponsorId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ipAddress: ip,
    });
  } catch {
    // Audit write failures must never block the underlying mutation.
    // If this ever happens, it shows up in app logs via the DB client.
  }
}
