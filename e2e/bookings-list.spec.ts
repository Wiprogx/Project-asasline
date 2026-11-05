import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { choose, expectToast, fillMandatory, login, open, pickCity, submit, tag } from "./helpers";

async function contact(page: Page, name: string, extra: Record<string, string> = {}) {
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  for (const [label, value] of Object.entries(extra)) await page.getByLabel(label).fill(value);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test("the bookings list filters by period, type and line, searches the whole file, and shows the columns chosen", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E List Client ${t}`;
  const line = `E2E List Line ${t}`;
  await login(page);
  await contact(page, client);
  await contact(page, line, { Professions: "Carrier" });

  await open(page, "/bookings/new");
  await choose(page.getByLabel("Customer"), { label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  await open(page, `${page.url()}/edit`);
  await choose(page.getByLabel("Shipping line"), { label: line });
  // The terminal is a location of the line, made in place.
  await page.getByRole("button", { name: "+ New terminal" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Name", { exact: true }).fill(`Terminal ${t}`);
  await dlg.getByLabel("Street", { exact: true }).fill("Scheldelaan 1");
  await dlg.getByRole("combobox", { name: "Country" }).fill("BE");
  await page.getByRole("option").first().click();
  await pickCity(page, "Antwerpen", dlg);
  await submit(page, dlg.getByRole("button", { name: "Add the terminal" }));
  await expectToast(page, `Terminal ${t} added as Terminal`);
  await submit(page, page.getByRole("button", { name: "Save booking" }));
  await expectToast(page, "Saved");

  const table = page.getByRole("table", { name: "Bookings" });
  const row = () => table.getByRole("row").filter({ hasText: ref });
  // The search reads the whole file: the terminal, a party on it.
  await open(page, `/bookings?q=${encodeURIComponent(`Terminal ${t}`)}`);
  await expect(row()).toBeVisible();
  await open(page, `/bookings?q=${encodeURIComponent(line)}`);
  await expect(row()).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Status" }).getByRole("link", { name: "All 1" }),
  ).toBeVisible();

  // The line and the type filter it; an import view does not have it.
  await choose(page.getByRole("combobox", { name: "Shipping line" }), { label: line });
  await expect(page).toHaveURL(/carrier=/);
  await expect(row()).toBeVisible();
  await choose(page.getByLabel("Export or import"), { label: "Import" });
  await expect(page.getByText("No bookings match.")).toBeVisible();
  await choose(page.getByLabel("Export or import"), { label: "All types" });
  await expect(row()).toBeVisible();

  // Undated, it counts on today: in this month.
  await page
    .getByRole("navigation", { name: "Period" })
    .getByRole("link", { name: "This month" })
    .click();
  await expect(page).toHaveURL(/period=month/);
  await expect(row()).toBeVisible();

  // The columns are the person's own and survive a reload: the line added, the value taken away.
  await expect(table.getByRole("columnheader", { name: "Shipping line" })).toHaveCount(0);
  await page.locator("summary", { hasText: "Columns" }).click();
  const picks = page.getByRole("group", { name: "Columns" });
  let saved = page.waitForResponse((r) => r.request().method() === "POST");
  await picks.getByLabel("Shipping line").check();
  await saved;
  await expect(table.getByRole("columnheader", { name: "Shipping line" })).toBeVisible();
  await expect(row()).toContainText(line);
  saved = page.waitForResponse((r) => r.request().method() === "POST");
  await picks.getByLabel("Value").uncheck();
  await saved;
  await expect(table.getByRole("columnheader", { name: "Value" })).toHaveCount(0);
  // Papers in / papers needed, from the document chain.
  saved = page.waitForResponse((r) => r.request().method() === "POST");
  await picks.getByLabel("Documents").check();
  await saved;
  await expect(table.getByRole("columnheader", { name: "Documents" })).toBeVisible();
  await expect(row()).toContainText(/\d+\/\d+ papers in|—/);
  await open(page, `/bookings?q=${encodeURIComponent(line)}`);
  await expect(table.getByRole("columnheader", { name: "Shipping line" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Value" })).toHaveCount(0);

  // A header orders the list, the order in the URL.
  await table.getByRole("button", { name: "Our reference" }).click();
  await expect(page).toHaveURL(/sort=ref/);
  await expect(table.getByRole("columnheader", { name: "Our reference" })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );

  // A right click on the customer leaves out the rows like it; the chip puts them back.
  await row().getByRole("cell").filter({ hasText: client }).click({ button: "right" });
  await page.getByRole("menuitem", { name: `Filter out · Customer: ${client}` }).click();
  await expect(page).toHaveURL(/xclient=/);
  await expect(page.getByText("No bookings match.")).toBeVisible();
  await page.getByRole("link", { name: /Not customer: / }).click();
  await expect(row()).toBeVisible();

  // Reset puts the columns back.
  await page.locator("summary", { hasText: "Columns" }).click();
  saved = page.waitForResponse((r) => r.request().method() === "POST");
  await page.getByRole("button", { name: "Reset" }).click();
  await saved;
  await expect(table.getByRole("columnheader", { name: "Shipping line" })).toHaveCount(0);
  await expect(table.getByRole("columnheader", { name: "Value" })).toBeVisible();
});
