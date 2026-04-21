"use server";

import { revalidatePath } from "next/cache";
import { eq, sql, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { securityCredits, DEFAULT_SCORE_BY_SEVERITY, SEVERITY_LEVELS, type Severity } from "@/lib/hall-of-fame/schema";
import { users } from "@/lib/db/schema";
import { requireAdmin, requireAdminWithTotp } from "@/lib/admin/guards";
import { recordAudit } from "@/lib/admin/audit";
import { announceHallOfFame } from "@/lib/discord/announce";
import { importFromPr } from "@/lib/hall-of-fame/import-pr";

type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

function isSeverity(v: string): v is Severity {
  return (SEVERITY_LEVELS as readonly string[]).includes(v);
}

// Admin: create a new credit row in `pending` state. No scoring effect
// until confirmed — so no fresh-TOTP gate here, only admin-session. The
// TOTP friction moves to confirmCredit / deleteCredit / rejectCredit
// where state actually changes.
export async function createCredit(input: {
  displayName: string;
  discordHandle?: string;
  externalLink?: string;
  findingTitle: string;
  findingDescription?: string;
  classRef?: string;
  severity: string;
  prRef?: string;
  securityScore?: number;
  userId?: string;
  notes?: string;
}): Promise<Result<{ id: string }>> {
  const check = await requireAdmin();
  if ("error" in check) return { ok: false, error: check.error };

  if (!isSeverity(input.severity)) {
    return { ok: false, error: `Invalid severity: ${input.severity}` };
  }
  if (!input.displayName.trim() || !input.findingTitle.trim()) {
    return { ok: false, error: "displayName and findingTitle required" };
  }

  const score =
    typeof input.securityScore === "number" && input.securityScore > 0
      ? input.securityScore
      : DEFAULT_SCORE_BY_SEVERITY[input.severity];

  const [row] = await db
    .insert(securityCredits)
    .values({
      userId: input.userId || null,
      displayName: input.displayName.trim(),
      discordHandle: input.discordHandle?.trim() || null,
      externalLink: input.externalLink?.trim() || null,
      findingTitle: input.findingTitle.trim(),
      findingDescription: input.findingDescription?.trim() || null,
      classRef: input.classRef?.trim() || null,
      severity: input.severity,
      prRef: input.prRef?.trim() || null,
      securityScore: score,
      status: "pending",
      notes: input.notes?.trim() || null,
    })
    .returning({ id: securityCredits.id });

  await recordAudit({
    actor: check.actor,
    action: "hall_of_fame.create",
    metadata: { creditId: row.id, displayName: input.displayName },
  });

  revalidatePath("/admin/hall-of-fame");
  return { ok: true, data: { id: row.id } };
}

// Admin: confirm a pending credit. Transitions status=confirmed, stamps
// awardedAt/awardedBy, bumps the linked user's denormalized security_score
// and flips is_hall_of_fame true. Fires Discord announcement.
export async function confirmCredit(
  creditId: string,
  totpCode: string,
): Promise<Result> {
  const check = await requireAdminWithTotp(totpCode);
  if ("error" in check) return { ok: false, error: check.error };

  const [credit] = await db
    .select()
    .from(securityCredits)
    .where(eq(securityCredits.id, creditId))
    .limit(1);
  if (!credit) return { ok: false, error: "Credit not found" };
  if (credit.status === "confirmed") {
    return { ok: false, error: "Already confirmed" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(securityCredits)
      .set({
        status: "confirmed",
        awardedAt: sql`now()`,
        awardedBy: check.actor.id,
      })
      .where(eq(securityCredits.id, creditId));

    // Bump the linked user's hall-of-fame flag + running total only if
    // the credit is tied to a real account. Anonymous credits (userId
    // null) still appear on the public page via displayName.
    if (credit.userId) {
      await tx
        .update(users)
        .set({
          isHallOfFame: true,
          securityScore: sql`${users.securityScore} + ${credit.securityScore}`,
        })
        .where(eq(users.id, credit.userId));
    }
  });

  await recordAudit({
    actor: check.actor,
    action: "hall_of_fame.confirm",
    metadata: { creditId, userId: credit.userId },
  });

  // Fire-and-forget Discord announcement.
  void announceHallOfFame({
    displayName: credit.displayName,
    discordHandle: credit.discordHandle,
    findingTitle: credit.findingTitle,
    classRef: credit.classRef,
    severity: credit.severity,
    prRef: credit.prRef,
    securityScore: credit.securityScore,
  });

  revalidatePath("/admin/hall-of-fame");
  revalidatePath("/hall-of-fame");
  return { ok: true };
}

// Admin: reject a pending credit. Just flips status — nothing else changes.
export async function rejectCredit(
  creditId: string,
  totpCode: string,
): Promise<Result> {
  const check = await requireAdminWithTotp(totpCode);
  if ("error" in check) return { ok: false, error: check.error };
  await db
    .update(securityCredits)
    .set({ status: "rejected" })
    .where(eq(securityCredits.id, creditId));
  await recordAudit({
    actor: check.actor,
    action: "hall_of_fame.reject",
    metadata: { creditId },
  });
  revalidatePath("/admin/hall-of-fame");
  return { ok: true };
}

// Admin: hard delete. If the credit was already confirmed, reverse the
// user's score + clear is_hall_of_fame when they have no other confirmed
// credits left.
export async function deleteCredit(
  creditId: string,
  totpCode: string,
): Promise<Result> {
  const check = await requireAdminWithTotp(totpCode);
  if ("error" in check) return { ok: false, error: check.error };

  const [credit] = await db
    .select()
    .from(securityCredits)
    .where(eq(securityCredits.id, creditId))
    .limit(1);
  if (!credit) return { ok: false, error: "Credit not found" };

  await db.transaction(async (tx) => {
    await tx.delete(securityCredits).where(eq(securityCredits.id, creditId));

    if (credit.status === "confirmed" && credit.userId) {
      await tx
        .update(users)
        .set({
          securityScore: sql`GREATEST(0, ${users.securityScore} - ${credit.securityScore})`,
        })
        .where(eq(users.id, credit.userId));

      // Check if this was the user's last confirmed credit — if so, clear
      // the hall-of-fame flag so the golden-name styling drops off.
      const [remaining] = await tx
        .select({ cnt: sql<number>`count(*)::int` })
        .from(securityCredits)
        .where(
          and(
            eq(securityCredits.userId, credit.userId),
            eq(securityCredits.status, "confirmed"),
          ),
        );
      if (!remaining?.cnt) {
        await tx
          .update(users)
          .set({ isHallOfFame: false })
          .where(eq(users.id, credit.userId));
      }
    }
  });

  await recordAudit({
    actor: check.actor,
    action: "hall_of_fame.delete",
    metadata: { creditId, wasConfirmed: credit.status === "confirmed" },
  });

  revalidatePath("/admin/hall-of-fame");
  revalidatePath("/hall-of-fame");
  return { ok: true };
}

// Admin: lookup a user by username OR discord handle (case-insensitive).
// Used by the create form to auto-link a credit to a platform account
// without the admin copying UUIDs around.
export async function lookupUserByHandle(
  handle: string,
): Promise<
  | {
      ok: true;
      match: {
        id: string;
        username: string;
        discordUsername: string | null;
      } | null;
    }
  | { ok: false; error: string }
> {
  const check = await requireAdmin();
  if ("error" in check) return { ok: false, error: check.error };
  const q = handle.trim();
  if (!q) return { ok: true, match: null };
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      discordUsername: users.discordUsername,
    })
    .from(users)
    .where(
      sql`lower(${users.discordUsername}) = lower(${q}) OR lower(${users.username}) = lower(${q})`,
    )
    .limit(1);
  return { ok: true, match: row ?? null };
}

// Admin: import a PR via GitHub API and return the derived fields without
// persisting anything. The form hydrates its inputs from the result; the
// admin reviews + submits like normal. Two-step (import → create) so the
// admin still sees + confirms the data before a row lands.
export async function importCreditPreview(
  prRef: string,
): Promise<
  | {
      ok: true;
      data: {
        findingTitle: string;
        prRef: string;
        prUrl: string;
        reporterHandle: string | null;
        classRef: string | null;
        severity: string | null;
        findingDescription: string | null;
      };
    }
  | { ok: false; error: string }
> {
  const check = await requireAdmin();
  if ("error" in check) return { ok: false, error: check.error };
  const result = await importFromPr(prRef);
  if (!result.ok) return result;
  return {
    ok: true,
    data: {
      findingTitle: result.data.findingTitle,
      prRef: result.data.prRef,
      prUrl: result.data.prUrl,
      reporterHandle: result.data.reporterHandle,
      classRef: result.data.classRef,
      severity: result.data.severity,
      findingDescription: result.data.rawBodyFirstParagraph,
    },
  };
}

