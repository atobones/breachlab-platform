import { test, expect } from "@playwright/test";

const ROUTES = [
  "/",
  "/tracks/ghost",
  "/leaderboard",
  "/rules",
  "/donate",
  "/login",
  "/register",
];

test.describe("smoke", () => {
  for (const route of ROUTES) {
    test(`renders ${route} with sidebar`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByText("BreachLab", { exact: true }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /donate/i })).toBeVisible();
    });
  }

  test("/api/health responds 200", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
