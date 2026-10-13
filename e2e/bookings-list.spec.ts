import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

async function contact(page: Page, name: string, extra: Record<string, string> = {}) {
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  for (const [label, value] of Object.entries(extra)) await page.getByLabel(label).fill(value);
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
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  await open(page, `${page.url()}/edit`);
  await page.getByLabel("Shipping line").selectOption({ label: line });
  await page.getByLabel("Terminal").fill(`Terminal ${t}`);
  await submit(page, page.getByRole("button", { name: "Save booking" }));
  await expectToast(page, "Saved");

  const row = () => page.getByRole("row").filter({ hasText: ref });
  // The search reads the whole file: the terminal, a party on it.
  await open(page, `/bookings?q=${encodeURIComponent(`Terminal ${t}`)}`);
  await expect(row()).toBeVisible();
  await open(page, `/bookings?q=${encodeURIComponent(line)}`);
  await expect(row()).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Status" }).getByRole("link", { name: "All 1" }),
  ).toBeVisible();

  // The line and the type filter it; an import view does not have it.
  await page.getByRole("combobox", { name: "Shipping line" }).selectOption({ label: line });
  await expect(page).toHaveURL(/carrier=/);
  await expect(row()).toBeVisible();
  await page.getByLabel("Export or import").selectOption({ label: "Import" });
  await expect(page.getByText("No bookings match.")).toBeVisible();
  await page.getByLabel("Export or import").selectOption({ label: "All types" });
  await expect(row()).toBeVisible();

  // Undated, it counts on today: in this month, compared with the one before.
  await page.getByLabel("Period").selectOption({ label: "This month" });
  await expect(row()).toBeVisible();
  await page.getByLabel("Compare with the period before").check();
  await expect(page).toHaveURL(/cmp=prev/);
  await expect(page.getByText(/was /).first()).toBeVisible();

  // The columns chosen: the line added, the value taken away.
  await page.getByText("Choose the columns").click();
  await page.getByRole("checkbox", { name: "Shipping line" }).check();
  await expect(page.getByRole("columnheader", { name: "Shipping line" })).toBeVisible();
  await expect(row()).toContainText(line);
  await page.getByRole("checkbox", { name: "Value" }).uncheck();
  await expect(page.getByRole("columnheader", { name: "Value" })).toHaveCount(0);
  await expect(page).toHaveURL(/cols=/);
});
