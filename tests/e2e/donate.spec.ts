import { test, expect } from "@playwright/test";

test.describe("donate page", () => {
  test("renders with form and not-configured notice", async ({ page }) => {
    await page.goto("/donate");
    await expect(page.locator('[data-testid="donate-page"]')).toBeVisible();
    await expect(page.getByText(/Support BreachLab/)).toBeVisible();
    // BTCPay is not configured in the test env
    await expect(page.getByText(/Donations are not active yet/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Donations not available/ }),
    ).toBeVisible();
  });

  test("preset buttons populate amount input", async ({ page }) => {
    await page.goto("/donate");
    await page.click('[data-testid="preset-25"]');
    await expect(page.locator('input[name="amount"]')).toHaveValue("25");
    await page.click('[data-testid="preset-100"]');
    await expect(page.locator('input[name="amount"]')).toHaveValue("100");
  });

  test("thanks flash renders after ?thanks=1", async ({ page }) => {
    await page.goto("/donate?thanks=1");
    await expect(page.locator('[data-testid="donate-flash"]')).toContainText(
      /Thank you/,
    );
  });
});
