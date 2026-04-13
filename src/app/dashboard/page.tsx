import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth/session";
import { getBadgesForUser } from "@/lib/badges/queries";
import { BadgePill } from "@/components/badges/BadgePill";
import { isBadgeKind } from "@/lib/badges/types";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { DiscordLinkCard } from "@/components/dashboard/DiscordLinkCard";
import { isConfigured as isDiscordConfigured } from "@/lib/discord/oauth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  const userBadges = await getBadgesForUser(user.id);
  const [userRow] = await db
    .select({ discordUsername: users.discordUsername })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  return (
    <div className="space-y-6">
      <h1 className="text-amber text-xl">Operative dashboard</h1>
      <p className="text-sm">
        Welcome, <span className="text-amber">{user.username}</span>.{" "}
        <a href={`/u/${user.username}`} className="text-muted underline">
          public profile →
        </a>
      </p>
      <DiscordLinkCard
        discordUsername={userRow?.discordUsername ?? null}
        configured={isDiscordConfigured()}
      />
      {!user.emailVerified && (
        <p className="text-red text-xs">
          Email not verified. Check your inbox for the verification link.
        </p>
      )}
      <section>
        <h2 className="text-lg mb-2">Badges</h2>
        {userBadges.length === 0 ? (
          <p className="text-muted text-xs">
            Take a first blood or complete a track to earn your first badge.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {userBadges.map((b) =>
              isBadgeKind(b.kind) ? (
                <li key={b.id}>
                  <BadgePill kind={b.kind} />
                </li>
              ) : null
            )}
          </ul>
        )}
      </section>
      <ul className="text-sm space-y-2">
        <li>
          <a href="/dashboard/account">Account settings</a>
        </li>
        <li>
          <a href="/dashboard/2fa">
            Two-factor authentication{" "}
            <span className={user.totpEnabled ? "text-green" : "text-muted"}>
              ({user.totpEnabled ? "enabled" : "disabled"})
            </span>
          </a>
        </li>
      </ul>
    </div>
  );
}
