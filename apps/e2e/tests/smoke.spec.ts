import { expect, test } from "@playwright/test";

const routes = [
  ["/patients", "Patient Search / Registration", "Patient Results"],
  ["/workspace/setup", "Clinical Workspace - Encounter Setup", "Current Pregnancy"],
  ["/workspace", "Clinical Workspace - Live Encounter", "Live Transcript"],
  ["/review", "Clinical Workspace - Review / Intelligence", "Progressive Summary"],
  ["/admin", "Admin / Role Management", "Users"],
  ["/audit", "Clinical Workspace - Read-Only Audit", "Audit Events"]
] as const;

for (const [path, heading, landmarkText] of routes) {
  test(`loads ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
    await expect(page.getByText(landmarkText, { exact: true }).first()).toBeVisible();
    await expect(page.locator(".clinical-panel").first()).toBeVisible();
  });
}

test("keeps critical pages readable at tablet width", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 980 });
  for (const [path, heading] of routes) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
    await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  }
});
