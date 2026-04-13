import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";
import { syncUserRoles, syncAllUsers } from "../src/lib/discord/sync";
import { hasBotToken } from "../src/lib/discord/client";

async function main() {
  if (!hasBotToken() || !process.env.DISCORD_GUILD_ID) {
    console.error(
      "Discord bot not configured. Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.",
    );
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const userIdx = args.indexOf("--user");
  if (userIdx !== -1) {
    const username = args[userIdx + 1];
    if (!username) {
      console.error("--user requires a username");
      process.exit(1);
    }
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (!user) {
      console.error(`User "${username}" not found.`);
      process.exit(1);
    }
    await syncUserRoles(user.id);
    console.log(`Synced roles for ${username}`);
    process.exit(0);
  }

  const result = await syncAllUsers();
  console.log(
    `sync done: ${result.synced} synced, ${result.skipped} skipped, ${result.errors} errors`,
  );
  process.exit(result.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
