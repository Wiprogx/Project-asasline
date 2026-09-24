import { expect, test } from "./fixtures";
import { expectToast, login, submit, tag } from "./helpers";

test("the catalogue prices an item, and a customer agreement overrides it", async ({ page }) => {
  const t = tag();
  const pod = `Z${t.slice(-4).toUpperCase()}`;
  await login(page);

  // An ocean leg without its port of discharge is refused, then added.
  await page.goto("/settings/catalogue");
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Carrier", { exact: true }).fill("E2E LINE");
  await page.getByLabel("Sell (EUR)").fill("3100");
  await page.getByLabel("Buy (EUR)").fill("2000");
  await submit(page, page.getByRole("button", { name: "Add item" }));
  await expectToast(page, "An ocean leg needs its port of loading and discharge.");
  await expect(page.getByLabel("Carrier", { exact: true })).toHaveValue("E2E LINE");
  await page.getByLabel("Port of discharge").fill(pod);
  await submit(page, page.getByRole("button", { name: "Add item" }));
  await expectToast(page, "Added to the catalogue");
  const label = `BEANR › ${pod} · E2E LINE`;
  await expect(page.getByRole("link", { name: label })).toBeVisible();

  // Its category shows the fields that identify it.
  await page.getByLabel("Category").selectOption({ label: "Country document" });
  await expect(page.getByLabel("Document code")).toBeVisible();
  await expect(page.getByLabel("Port of discharge")).toHaveCount(0);

  const client = `E2E Agreement Client ${t}`;
  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await expect(page.getByText("None — quotations use the catalogue.")).toBeVisible();

  await page.goto("/settings/price-lists");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Agreement").fill("2026 agreement");
  await page.getByLabel("Valid from").fill("2026-01-01");
  await page.getByRole("button", { name: "Add agreement" }).click();
  await expect(page.getByRole("heading", { name: "2026 agreement" })).toBeVisible();
  const listUrl = page.url();

  await page.getByLabel("Catalogue item").selectOption({ label: `${label} · ocean` });
  await page.getByLabel("Agreed sell (EUR)").fill("2950");
  await submit(page, page.getByRole("button", { name: "Set price" }));
  await expectToast(page, "Agreed price saved");
  const row = page.getByRole("row").filter({ hasText: label });
  await expect(row).toContainText("€2,950.00");
  await expect(row).toContainText("€2,000.00"); // empty buy: the catalogue's
  await expect(row).toContainText("€3,100.00");

  // A second agreement on the same days is refused.
  await page.goto("/settings/price-lists");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Agreement").fill("Spot deal");
  await page.getByLabel("Valid from").fill("2026-06-01");
  await submit(page, page.getByRole("button", { name: "Add agreement" }));
  await expectToast(page, /"2026 agreement" already covers these days/);

  // Removing the price asks why, and the catalogue applies again.
  await page.goto(listUrl);
  await row.getByRole("button", { name: "Remove" }).click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("Customer left the deal");
  await submit(page, page.getByRole("button", { name: "Remove" }).last());
  await expectToast(page, "Removed — the catalogue price applies again");
  await expect(page.getByText(/No agreed price yet/)).toBeVisible();
});
