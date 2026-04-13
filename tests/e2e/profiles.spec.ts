import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { createHash } from "node:crypto";

const DB_URL =
  process.env.DATABASE_URL ??
  "postgres://breachlab:breachlab@127.0.0.1:5432/breachlab";

const sql = postgres(DB_URL);

function sha256Hex(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

const FLAG = "FLAG{ghost_profile_e2e}";

test.describe("public profiles", () => {
  test.beforeAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, flags, levels, tracks, speedrun_runs, badges, discord_oauth_states CASCADE`;
    const [track] = await sql`
      INSERT INTO tracks (slug, name, description, status, order_idx)
      VALUES ('ghost', 'Ghost', 'e2e profile', 'live', 0)
      RETURNING id
    `;
    const [level] = await sql`
      INSERT INTO levels (track_id, idx, title, points_base, points_first_blood_bonus)
      VALUES (${track.id}, 0, 'First Contact', 100, 50)
      RETURNING id
    `;
    await sql`INSERT INTO flags (level_id, flag_hash) VALUES (${level.id}, ${sha256Hex(FLAG)})`;
  });

  test.afterAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, flags, levels, tracks, speedrun_runs, badges, discord_oauth_states CASCADE`;
    await sql.end();
  });

  test("public profile renders for existing user with badges", async ({ page }) => {
    const username = `profileop_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    await page.goto("/submit");
    await page.fill('input[name="flag"]', FLAG);
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Captured ghost level 0/)).toBeVisible();

    await page.goto(`/u/${username}`);
    await expect(page.locator('[data-testid="profile-page"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="profile-page"]').getByText(`@${username}`),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="profile-page"]').getByText(/Joined /),
    ).toBeVisible();
    // First blood badge was awarded (solo solver → first blood)
    await expect(
      page
        .locator('[data-testid="profile-page"]')
        .getByText("First Blood", { exact: true }),
    ).toBeVisible();
  });

  test("/u/nonexistent returns 404", async ({ page }) => {
    const resp = await page.goto("/u/zzz_does_not_exist_zzz");
    expect(resp?.status()).toBe(404);
  });

  test("dashboard shows Link Discord button when configured", async ({ page }) => {
    const username = `discordop_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    await expect(page.getByRole("link", { name: "Link Discord" })).toBeVisible();
  });
});
