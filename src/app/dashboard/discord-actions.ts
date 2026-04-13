"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getCurrentSession } from "@/lib/auth/session";

export async function unlinkDiscord(): Promise<void> {
  const { user } = await getCurrentSession();
  if (!user) throw new Error("Unauthorized");
  await db
    .update(users)
    .set({ discordId: null, discordUsername: null })
    .where(eq(users.id, user.id));
  revalidatePath("/dashboard");
}
