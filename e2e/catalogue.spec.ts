import { expect, test } from "./fixtures";
import {
  choose,
  expectToast,
  fillMandatory,
  login,
  makeCarrier,
  newItem,
  open,
  pick,
  portTag,
  submit,
  tag,
} from "./helpers";

test("the catalogue prices an item, and a customer agreement overrides it", async ({ page }) => {
  // The whole office in one journey: carrier, catalogue, agreement, quotation.
  test.slow();
  const t = tag();
  const pod = portTag();
  await login(page);

  // The shipping line is a contact with the Carrier profession, picked — never typed.
  const line = await makeCarrier(page, `E2E LINE ${t}`);
  // An ocean leg without its port of discharge is refused — the dialog stays — then added.
  await newItem(page);
  await pick(page, page.getByRole("combobox", { name: "Port of loading" }), "BEANR");
  await pick(page, page.getByRole("combobox", { name: "Shipping line" }), line);
  await page.getByLabel("Sell price (€)").fill("3100");
  await page.getByLabel("Buy price / cost (€)").fill("2000");
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, "An ocean leg needs its port of loading and discharge.");
  await expect(page.getByRole("combobox", { name: "Shipping line" })).toHaveValue(line);
  await pick(page, page.getByRole("combobox", { name: "Port of discharge" }), pod);
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, "Added to the catalogue");
  const label = `BEANR › ${pod} · 40HC · ${line}`;
  await expect(page.getByRole("link", { name: label })).toBeVisible();

  // Each category has its own form (legacy fItem): a document's, not the leg's.
  await page.getByRole("button", { name: "New item" }).click();
  await choose(page.getByLabel("Category"), { label: "Country document" });
  await expect(page.getByLabel(/^Document code/)).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Port of discharge" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  const client = `E2E Agreement Client ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await expect(page.getByText("None — quotations use the catalogue.")).toBeVisible();

  await open(page, "/settings/price-lists");
  await choose(page.getByLabel("Customer"), { label: client });
  await page.getByLabel("Agreement").fill("2026 agreement");
  await page.getByLabel("Valid from").fill("2026-01-01");
  await page.getByRole("button", { name: "Add agreement" }).click();
  await expect(page.getByRole("heading", { name: "2026 agreement" })).toBeVisible();
  const listUrl = page.url();

  await choose(page.getByLabel("Catalogue item"), { label: `${label} · ocean` });
  await page.getByLabel("Agreed sell (EUR)").fill("2950");
  await submit(page, page.getByRole("button", { name: "Set price" }));
  await expectToast(page, "Agreed price saved");
  const row = page.getByRole("row").filter({ hasText: label });
  await expect(row).toContainText("€2,950.00");
  await expect(row).toContainText("€2,000.00"); // empty buy: the catalogue's
  await expect(row).toContainText("€3,100.00");

  // A second agreement on the same days is refused.
  await open(page, "/settings/price-lists");
  await choose(page.getByLabel("Customer"), { label: client });
  await page.getByLabel("Agreement").fill("Spot deal");
  await page.getByLabel("Valid from").fill("2026-06-01");
  await submit(page, page.getByRole("button", { name: "Add agreement" }));
  await expectToast(page, /"2026 agreement" already covers these days/);

  // Removing the price asks why, and the catalogue applies again.
  await open(page, listUrl);
  await row.getByRole("button", { name: "Remove" }).click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("Customer left the deal");
  await submit(page, page.getByRole("button", { name: "Remove" }).last());
  await expectToast(page, "Removed — the catalogue price applies again");
  await expect(page.getByText(/No agreed price yet/)).toBeVisible();
});
