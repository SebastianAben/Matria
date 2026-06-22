import { expect, test } from "@playwright/test";

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@matriacare.site";
const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me-in-local-dev";

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/patients");
}

test("clinician completes backend-driven consultation through approved memory and FHIR export", async ({ page }) => {
  test.setTimeout(120000);
  await expect
    .poll(async () => (await fetch("http://127.0.0.1:4000/ready")).status, { timeout: 120000 })
    .toBe(200);

  const stamp = Date.now();
  const clinicianEmail = `clinician-${stamp}@matria.local`;
  const clinicianPassword = `Clinical-${stamp}`;
  const mrn = `MRN-${stamp}`;

  await signIn(page, adminEmail, adminPassword);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Create User" })).toBeVisible();
  const createUserPanel = page.locator("section").filter({ hasText: "Create User" });
  await createUserPanel.getByLabel("Email").fill(clinicianEmail);
  await createUserPanel.getByLabel("Full name").fill("Clinician Flow Tester");
  await createUserPanel.getByLabel("Temporary password").fill(clinicianPassword);
  await createUserPanel.getByLabel("Initial role").selectOption("clinician");
  await createUserPanel.getByRole("button", { name: "Create user" }).click();
  await expect(page.getByText(`User ${clinicianEmail} created.`)).toBeVisible();

  await page.evaluate(() => fetch("http://localhost:4000/auth/logout", { method: "POST", credentials: "include" }));
  await signIn(page, clinicianEmail, clinicianPassword);

  await page.goto("/patients");
  await expect(page.getByText("No search yet")).toBeVisible();
  const registerPatientPanel = page.locator("section").filter({ hasText: "Register Patient" });
  await registerPatientPanel.getByLabel("Full name").fill("Progressive Consultation Patient");
  await registerPatientPanel.getByLabel("MRN").fill(mrn);
  await registerPatientPanel.getByLabel("Date of birth").fill("1993-08-12");
  await registerPatientPanel.getByLabel("Phone").fill("0800000000");
  await registerPatientPanel.getByLabel("Address").fill("Backend-created test address");
  await registerPatientPanel.getByRole("button", { name: "Save patient" }).click();
  await expect(page.getByText("Patient created and selected")).toBeVisible();
  await page.getByRole("link", { name: "Continue setup" }).click();

  const episodePanel = page.locator("section").filter({ hasText: "Create Pregnancy Episode" });
  await episodePanel.getByLabel("Label").fill("Current ANC episode");
  await episodePanel.getByLabel("Gestational age weeks").fill("28");
  await episodePanel.getByLabel("Estimated due date").fill("2026-09-30");
  await episodePanel.getByRole("button", { name: "Save episode" }).click();
  await expect(page.getByText("Pregnancy episode created and selected.")).toBeVisible();

  const encounterPanel = page.locator("section").filter({ hasText: "Encounter Details" });
  await encounterPanel.getByLabel("Visit type").selectOption("routine_anc");
  await encounterPanel.getByLabel("Facility").fill("Local ANC Clinic");
  await encounterPanel.getByRole("button", { name: "Create encounter" }).click();
  await expect(page.getByText("Encounter created.")).toBeVisible();

  const consentPanel = page.locator("section").filter({ hasText: "Consent Capture" });
  for (const mode of ["audio", "transcript", "ai", "fhir_export"]) {
    await consentPanel.getByLabel("Mode").selectOption(mode);
    await consentPanel.getByLabel("Status").selectOption("granted");
    await consentPanel.getByLabel("Note").fill(`${mode} consent granted during E2E flow`);
    await consentPanel.getByRole("button", { name: "Record consent" }).click();
    await expect(page.getByText(`${mode} consent recorded as granted.`)).toBeVisible();
  }
  await page.getByRole("button", { name: "Open workspace" }).click();

  await expect(page.getByText("No observations yet")).toBeVisible();
  const observationsPanel = page.locator("section").filter({ hasText: "Structured Observations" });
  await observationsPanel.getByLabel("Type").selectOption("vitals");
  await observationsPanel.getByLabel("Field").fill("bloodPressure");
  await observationsPanel.getByLabel("Value").fill("118/76");
  await observationsPanel.getByLabel("Unit").fill("mmHg");
  await observationsPanel.getByRole("button", { name: "Save observation" }).click();
  await expect(page.getByText("Observation saved.")).toBeVisible();

  const notePanel = page.locator("section").filter({ hasText: "Session Note" });
  await notePanel.getByLabel("Subjective / Objective / Assessment / Plan").fill(
    "S: Routine ANC visit with intermittent dizziness now resolved.\nO: BP 118/76, fetal movement present.\nA: Stable routine ANC review.\nP: Continue counseling and follow-up."
  );
  await notePanel.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText(/Session note saved as version/)).toBeVisible();

  const transcriptPanel = page.locator("section").filter({ hasText: "Live Transcript" });
  await transcriptPanel.getByLabel("Speaker").fill("Clinician");
  await transcriptPanel.getByLabel("Transcript text").fill("Patient reports fetal movement and no bleeding or fluid leakage.");
  await transcriptPanel.getByRole("button", { name: "Add transcript turn" }).click();
  await expect(page.getByText("Transcript turn added.")).toBeVisible();

  await page.getByRole("button", { name: "Run preflight" }).click();
  await expect(page.getByText(/Preflight completed/)).toBeVisible();
  await page.getByRole("button", { name: "Run synthesis" }).click();
  await expect(page.getByText("Synthesis completed.")).toBeVisible({ timeout: 15000 });
  await page.getByRole("link", { name: "Open review" }).click();

  await expect(page.getByText("Referral summary draft")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Referral summary draft" }).click();
  await page.getByRole("button", { name: "Approve" }).first().click();
  await expect(page.getByText("Output approve saved.")).toBeVisible();
  await page.getByRole("button", { name: "Write memory" }).click();
  await expect(page.getByText(/Memory writeback created/)).toBeVisible();
  await page.getByRole("button", { name: "Referral FHIR" }).click();
  await expect(page.getByText("referral FHIR document bundle generated.")).toBeVisible();
  await expect(page.getByText('"resourceType": "Bundle"')).toBeVisible();

  await page.evaluate(() => fetch("http://localhost:4000/auth/logout", { method: "POST", credentials: "include" }));
  await signIn(page, adminEmail, adminPassword);
  await page.goto("/audit");
  await expect(page.getByText("backend audit event")).toBeVisible();
  await expect(page.locator(".data-table").first()).toBeVisible();
});

test("critical pages stay readable at tablet width without fixture data", async ({ page }) => {
  test.setTimeout(60000);
  await expect
    .poll(async () => (await fetch("http://127.0.0.1:4000/ready")).status, { timeout: 120000 })
    .toBe(200);

  await page.setViewportSize({ width: 768, height: 980 });
  await signIn(page, adminEmail, adminPassword);

  for (const path of ["/patients", "/workspace/setup", "/workspace", "/review", "/admin", "/audit"]) {
    await page.goto(path);
    await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
  }
});
