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

const FLAG = "FLAG{ghost_l0_tracks_e2e}";

test.describe("tracks + leaderboard", () => {
  test.beforeAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, flags, levels, tracks CASCADE`;
    const [track] = await sql`
      INSERT INTO tracks (slug, name, description, status, order_idx)
      VALUES ('ghost', 'Ghost', 'e2e', 'live', 0)
      RETURNING id
    `;
    const [level] = await sql`
      INSERT INTO levels (track_id, idx, title, points_base, points_first_blood_bonus)
      VALUES (${track.id}, 0, 'First Contact', 100, 50)
      RETURNING id
    `;
    await sql`
      INSERT INTO flags (level_id, flag_hash)
      VALUES (${level.id}, ${sha256Hex(FLAG)})
    `;
  });

  test.afterAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, flags, levels, tracks CASCADE`;
    await sql.end();
  });

  test("register, submit flag, appear on leaderboard and top 5", async ({ page }) => {
    const username = `track_op_${Date.now()}`;
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

    await page.goto("/leaderboard");
    await expect(page.getByText(`@${username}`).first()).toBeVisible();

    await page.goto("/");
    await expect(
      page.locator('[data-testid="top-five-row"]', { hasText: username })
    ).toBeVisible();
  });

  test("invalid flag rejected", async ({ page }) => {
    const username = `track_op2_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";
    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    await page.goto("/submit");
    await page.fill('input[name="flag"]', "FLAG{not_a_real_flag}");
    await page.click('button[type="submit"]');
    // Any rejection text (Unknown flag / Invalid flag format / Not logged in)
    await expect(
      page.getByText(/Unknown flag|Invalid flag|Not logged in|Already solved/)
    ).toBeVisible();
  });
});
