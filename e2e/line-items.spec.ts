import { expect, test } from "./fixtures";
import { login, open, submit, tag } from "./helpers";

test("a line picked from the general items takes its account, and the books follow", async ({
  page,
}) => {
  const t = tag();
  await login(page);

  // The legacy ten, in Settings.
  await open(page, "/settings/line-items");
  const box = page.getByLabel("Line items, one per line");
  await expect(box).toHaveValue(
    /s_other \| sale \| Other income \(not a shipment\) \| 740000 \| S21/,
  );

  // A customer, a blank draft, a line from the picker: description, VAT and account come with it.
  const client = `E2E Items ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/accounting");
  await page.getByLabel("Customer", { exact: true }).selectOption({ label: client });
  await page.getByRole("button", { name: "New invoice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Draft for ${client}`);
  await page.getByLabel("Item").selectOption({ label: "Other income (not a shipment) · general" });
  await expect(page.getByLabel("Line", { exact: true })).toHaveValue(
    "Other income (not a shipment)",
  );
  await expect(page.getByLabel("VAT", { exact: true })).toHaveValue("S21");
  await page.getByLabel("Line", { exact: true }).fill(`Sold the old printer ${t}`);
  await page.getByLabel("Unit (EUR)").fill("100");
  await submit(page, page.getByRole("button", { name: "Add line" }));
  await expect(page.getByRole("cell", { name: `Sold the old printer ${t}` })).toBeVisible();
  await submit(page, page.getByRole("button", { name: "Issue invoice" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^INV\//);

  // The journal books the line where the item said, not on sales of shipping services.
  await open(page, `/accounting/journal?q=${encodeURIComponent(client)}`);
  await expect(page.getByRole("link", { name: "740000" }).first()).toBeVisible();
});
