import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("equipment on a bill becomes an asset, depreciated, and leaves the books when disposed of", async ({
  page,
}) => {
  const t = tag();
  const supplier = `E2E IT Shop ${t}`;
  const laptop = `Dell laptop ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(supplier);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: supplier })).toBeVisible();

  await open(page, "/accounting/bills");
  await page.getByLabel("Supplier", { exact: true }).selectOption({ label: supplier });
  await page.getByRole("button", { name: "New bill" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Bill from ${supplier}`);
  await page.getByLabel("Line", { exact: true }).fill(laptop);
  await page.getByLabel("Unit (EUR)").fill("1200");
  await page.getByLabel("Account").selectOption("230000");
  await submit(page, page.getByRole("button", { name: "Add line" }));
  await expect(page.getByRole("cell", { name: laptop })).toBeVisible();
  await page.getByLabel("Supplier's number").fill(`IT-${t}`);
  await submit(page, page.getByRole("button", { name: "Record bill" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^BILL\//);

  // An asset, not a cost: IT over three years, nothing depreciated in the month it was bought.
  await open(page, "/accounting/assets");
  const row = page.getByRole("row").filter({ hasText: laptop });
  await expect(row).toContainText("€1,200.00");
  await expect(row.getByLabel("Years")).toHaveValue("3");
  await row.getByLabel("Years").fill("4");
  await submit(page, row.getByRole("button", { name: "Set" }));
  await expectToast(page, "Depreciated over 4 years");

  await row.getByRole("button", { name: "Dispose" }).click();
  await page.getByRole("dialog").getByLabel("What happened").fill("Stolen from the car");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Dispose" }));
  await expectToast(page, "Disposed of — taken off the books");
  await expect(row).toContainText("Stolen from the car");

  // The journal books the disposal on its day: the whole cost as a loss.
  await open(page, `/accounting/journal?q=${encodeURIComponent(laptop)}`);
  const head = page.getByRole("row").filter({ hasText: `Disposed · ${laptop}` });
  await expect(head).toBeVisible();
});
