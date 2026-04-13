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

const FLAG_A = "FLAG{ghost_speedrun_e2e_a}";
const FLAG_B = "FLAG{ghost_speedrun_e2e_b}";

test.describe("speedrun + admin review", () => {
  test.beforeAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, flags, levels, tracks, speedrun_runs, badges CASCADE`;
    const [track] = await sql`
      INSERT INTO tracks (slug, name, description, status, order_idx)
      VALUES ('ghost', 'Ghost', 'e2e speedrun', 'live', 0)
      RETURNING id
    `;
    const [lvlA] = await sql`
      INSERT INTO levels (track_id, idx, title, points_base, points_first_blood_bonus)
      VALUES (${track.id}, 0, 'Speedrun A', 100, 50)
      RETURNING id
    `;
    const [lvlB] = await sql`
      INSERT INTO levels (track_id, idx, title, points_base, points_first_blood_bonus)
      VALUES (${track.id}, 1, 'Speedrun B', 100, 50)
      RETURNING id
    `;
    await sql`INSERT INTO flags (level_id, flag_hash) VALUES (${lvlA.id}, ${sha256Hex(FLAG_A)})`;
    await sql`INSERT INTO flags (level_id, flag_hash) VALUES (${lvlB.id}, ${sha256Hex(FLAG_B)})`;
  });

  test.afterAll(async () => {
    await sql`TRUNCATE users, sessions, email_verifications, password_resets, submissions, flags, levels, tracks, speedrun_runs, badges CASCADE`;
    await sql.end();
  });

  test("submission lifecycle: startRun → closeRun → appears on speedrun leaderboard", async ({ page }) => {
    const username = `speedop_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    await page.goto("/submit");
    await page.fill('input[name="flag"]', FLAG_A);
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Captured ghost level 0/)).toBeVisible();

    const [userRow] = await sql`SELECT id FROM users WHERE username=${username}`;
    const openRuns = await sql`
      SELECT started_at, finished_at FROM speedrun_runs WHERE user_id=${userRow.id}
    `;
    expect(openRuns.length).toBe(1);
    expect(openRuns[0].finished_at).toBeNull();

    await page.goto("/submit");
    await page.fill('input[name="flag"]', FLAG_B);
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Captured ghost level 1/)).toBeVisible();

    const closed = await sql`
      SELECT finished_at, total_seconds, is_suspicious, review_status
      FROM speedrun_runs WHERE user_id=${userRow.id}
    `;
    expect(closed.length).toBe(1);
    expect(closed[0].finished_at).not.toBeNull();
    expect(Number(closed[0].total_seconds)).toBeGreaterThanOrEqual(0);
    expect(closed[0].is_suspicious).toBe(true); // well under 900s threshold for ghost

    await page.goto("/leaderboard/speedrun");
    await expect(
      page.getByRole("table").getByText(username),
    ).toBeVisible();
  });

  test("/admin/review is 404 for non-admin", async ({ page }) => {
    const username = `nonadmin_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    const resp = await page.goto("/admin/review");
    expect(resp?.status()).toBe(404);
  });

  test("/admin/review accessible to admin with TOTP enabled", async ({ page }) => {
    const username = `admin_${Date.now()}`;
    const email = `${username}@test.local`;
    const password = "verysecurepassword";

    await page.goto("/register");
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard$/);

    await sql`
      UPDATE users SET is_admin=true, totp_secret='SECRETSECRETSECRET'
      WHERE username=${username}
    `;

    const resp = await page.goto("/admin/review");
    expect(resp?.status()).toBe(200);
    await expect(page.getByText(/Suspicious runs/)).toBeVisible();
  });
});
