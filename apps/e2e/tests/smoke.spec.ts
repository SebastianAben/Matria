import { expect, test } from "@playwright/test";

test("loads the clinical workspace shell", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page.getByRole("heading", { name: "Clinical Workspace" })).toBeVisible();
  await expect(page.getByText("Ambient intelligence pending later phases")).toBeVisible();
});

test("loads the ANC encounter capture route", async ({ page }) => {
  await page.goto("/patients");
  await expect(page.getByRole("heading", { name: "ANC Encounter Capture" })).toBeVisible();
  await expect(page.getByLabel("Search patient")).toBeVisible();
});
