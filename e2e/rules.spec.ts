import { expect, type Page, test } from "@playwright/test";
import { expectToast, login, submit, tag } from "./helpers";

/**
 * The document rules engine end to end, on a Gabon export out of Antwerp:
 * the chain opens its first steps, a done step opens the next, dates follow the booking,
 * a re-routed booking drops Gabon's papers, and a holiday moves a deadline.
 */
const CLOSINGS = {
  "Customs closing": "2026-10-05", // Monday: ASK_INV (−2) lands on Saturday → Friday 2 Oct
  "VGM closing": "2026-10-06",
  "SI & doc closing": "2026-10-07",
  "Port cut-off": "2026-10-08",
  ETD: "2026-10-12",
  ETA: "2026-11-02",
};

// A chain row by its code cell exactly: "Waits on BIETC_FILE" must not match BIETC_FILE.
const stepRow = (page: Page, code: string) =>
  page.getByRole("row").filter({ has: page.getByText(code, { exact: true }) });
const taskRow = (page: Page, text: string) => page.getByRole("listitem").filter({ hasText: text });

async function saveDetails(page: Page) {
  await submit(page, page.getByRole("button", { name: "Save booking" }));
  await expectToast(page, "Saved");
}

test("a booking's document chain follows the rules", async ({ page }) => {
  const t = tag();
  const client = `E2E Rules Client ${t}`;
  await login(page);
  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await page.goto("/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("GALBV");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const base = page.url();

  await page.goto(`${base}/edit`);
  for (const [label, day] of Object.entries(CLOSINGS))
    await page.getByLabel(label, { exact: true }).fill(day);
  await saveDetails(page);

  // The chain: Gabon's papers are in, the invoice waits on the request, a weekend is explained.
  await page.goto(`${base}/documents`);
  await expect(stepRow(page, "BIETC_FILE")).toBeVisible();
  await expect(stepRow(page, "INVOICE").getByText("Waits on ASK_INV")).toBeVisible();
  await expect(stepRow(page, "ASK_INV")).toContainText("2026-10-02");
  await expect(stepRow(page, "ASK_INV")).toContainText("moved: Saturday");

  // The first steps are tasks; doing the request opens the invoice step.
  await page.goto(`${base}/tasks`);
  await expect(taskRow(page, "Request the export invoice")).toBeVisible();
  await expect(taskRow(page, "Get the export invoice")).toHaveCount(0);
  await submit(
    page,
    taskRow(page, "Request the export invoice").getByRole("button", { name: "Done" }),
  );
  await expectToast(page, "Done");
  await page.reload();
  await expect(taskRow(page, "Get the export invoice")).toBeVisible();

  // Dates follow the booking: a later VGM closing redates the open VGM step.
  await page.goto(`${base}/edit`);
  await page.getByLabel("VGM closing").fill("2026-10-07");
  await saveDetails(page);
  await page.goto(`${base}/tasks`);
  await expect(taskRow(page, "Confirm the VGM was sent")).toContainText("2026-10-07");

  // Re-routed to Turkey: Gabon's open papers are withdrawn, with the reason.
  await page.goto(`${base}/edit`);
  await page.getByLabel("Port of discharge").fill("TRMER");
  await saveDetails(page);
  await page.goto(`${base}/tasks`);
  await expect(taskRow(page, "Request the BIETC number")).toContainText(
    "The document rule no longer applies to this booking",
  );
  await page.goto(`${base}/documents`);
  await expect(stepRow(page, "BIETC_FILE")).toHaveCount(0);

  // History records the engine's work.
  await page.goto(`${base}/history`);
  await expect(page.getByText(/^Document chain updated — opened .*ASK_INV/).first()).toBeVisible();
});

test("a holiday moves a deadline, and removing it moves it back", async ({ page }) => {
  const t = tag();
  const client = `E2E Holiday Client ${t}`;
  const holiday = `E2E Holiday ${t}`;
  await login(page);
  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await page.goto("/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const base = page.url();
  await page.goto(`${base}/edit`);
  await page.getByLabel("VGM closing").fill("2026-10-21"); // a Wednesday
  await saveDetails(page);

  await page.goto("/settings/holidays");
  await page.getByLabel("Country").fill("BE");
  await page.getByLabel("Date").fill("2026-10-21");
  await page.getByLabel("Name").fill(holiday);
  await submit(page, page.getByRole("button", { name: "Add holiday" }));
  await expectToast(page, /re-planned/);

  await page.goto(`${base}/documents`);
  await expect(stepRow(page, "VGM")).toContainText("2026-10-20");
  await expect(stepRow(page, "VGM")).toContainText(`moved: ${holiday}`);

  await page.goto("/settings/holidays");
  await submit(
    page,
    page.getByRole("listitem").filter({ hasText: holiday }).getByRole("button", { name: "Remove" }),
  );
  await expectToast(page, /re-planned/);
  await page.goto(`${base}/documents`);
  await expect(stepRow(page, "VGM")).toContainText("2026-10-21");
});

test("a rule switched off leaves every booking's chain, and comes back", async ({ page }) => {
  await login(page);
  await page.goto("/settings/rules");
  const loading = page.getByRole("row").filter({ hasText: "LOADING ·" });
  await submit(page, loading.getByRole("button", { name: "Switch off" }));
  await expectToast(page, /re-planned/);
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "LOADING ·" })
      .getByRole("button", { name: "Switch on" }),
  ).toBeVisible();
  await submit(
    page,
    page
      .getByRole("row")
      .filter({ hasText: "LOADING ·" })
      .getByRole("button", { name: "Switch on" }),
  );
  await expectToast(page, /re-planned/);
});

test("a rule whose prerequisite exists nowhere is refused", async ({ page }) => {
  await login(page);
  await page.goto("/settings/rules");
  await page.getByRole("button", { name: "Add rule" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Code", { exact: true }).fill(`E2E_${tag().toUpperCase().slice(0, 8)}`);
  await d.getByLabel("Document").fill("Test paper");
  await d.getByLabel("Step (what the person does)").fill("Do the test step");
  await d.getByLabel("Needs first (codes)").fill("NO_SUCH_CODE");
  await submit(page, d.getByRole("button", { name: "Save rule" }));
  await expect(d.getByText("No rule has the code NO_SUCH_CODE")).toBeVisible();
});
