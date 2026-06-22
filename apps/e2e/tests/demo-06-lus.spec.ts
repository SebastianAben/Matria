import { expect, test } from "@playwright/test";

test("06-LUS demo starts mid-consultation and progresses through restart", async ({ page }) => {
  test.setTimeout(75000);

  await page.goto("/demo/06-lus");

  await expect(page.getByRole("main").getByRole("heading", { name: "06-LUS Mid-Consultation" })).toBeVisible();
  const baselinePanel = page.locator("section").filter({ hasText: "Patient Context" });
  await expect(baselinePanel.getByText("20w0d", { exact: true })).toBeVisible();
  await expect(baselinePanel.getByText("69 kg / 168 cm")).toBeVisible();
  await expect(page.getByText("Urine/protein result missing").first()).toBeVisible();
  await expect(page.getByText("Your blood pressure was good earlier").first()).toBeVisible();
  await expect(page.getByText("Baseline summary draft")).toBeVisible();

  await page.getByRole("button", { name: "Start demo" }).click();
  await expect(page.getByRole("button", { name: "Start demo" })).toHaveCount(0);
  await expect(page.getByText("Session running")).toBeVisible();
  await page.waitForTimeout(6500);
  await expect(page.getByText("Let me confirm again")).toHaveCount(0);

  await expect(page.getByText("Let me confirm again").first()).toBeVisible({ timeout: 4000 });
  await expect(page.getByText("Fetal movement present").first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("Bleeding/fluid/contractions denied").first()).toBeVisible({ timeout: 12000 });
  await expect(page.getByText("Age risk linked to current visit").first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("Escalated until urine/protein result is entered").first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("Warning-sign counseling completed").first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Live working update").first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("the consultation is still in progress").first()).toBeVisible();

  await expect(page.getByRole("button", { name: "Restart demo" })).toBeVisible({ timeout: 7000 });
});
