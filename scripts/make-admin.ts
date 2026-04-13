import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error("Usage: npx tsx scripts/make-admin.ts <username>");
    process.exit(1);
  }

  const [existing] = await db
    .select({ id: users.id, username: users.username, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!existing) {
    console.error(`User "${username}" not found.`);
    process.exit(1);
  }

  if (existing.isAdmin) {
    console.log(`User "${username}" is already an admin.`);
    process.exit(0);
  }

  await db.update(users).set({ isAdmin: true }).where(eq(users.id, existing.id));
  console.log(`User "${username}" is now an admin.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
