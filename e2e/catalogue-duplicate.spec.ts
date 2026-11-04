import { expect, test } from "./fixtures";
import {
  addOceanLeg,
  choose,
  expectChosen,
  expectToast,
  login,
  makeCarrier,
  newItem,
  open,
  pick,
  submit,
  tag,
  takeOutOfCatalogue,
} from "./helpers";

test("a catalogue item is duplicated with its own carrier, prices and rate source", async ({
  page,
}) => {
  const t = tag();
  await login(page);
  const line = await makeCarrier(page, `E2E Dup line ${t}`);
  const other = await makeCarrier(page, `E2E Dup other ${t}`);
  await addOceanLeg(page, { pol: "BEANR", pod: "TRMER", carrier: line, sell: "1000", buy: "700" });

  // The original, opened from the catalogue.
  await open(page, `/settings/catalogue?q=${encodeURIComponent(line)}`);
  await page.getByRole("table").getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 2, name: new RegExp(line) })).toBeVisible();
  const original = page.url();

  // Duplicate: the other line, new prices, a spot rate; the rest as the original.
  await page.getByRole("button", { name: "Duplicate" }).click();
  const dlg = page.getByRole("dialog");
  await pick(page, dlg.getByRole("combobox", { name: "Shipping line" }), other);
  await dlg.getByLabel("Sell price (€)").fill("1250");
  await dlg.getByLabel("Buy price / cost (€)").fill("800");
  await choose(dlg.getByLabel("Rate source"), "spot");
  await submit(page, dlg.getByRole("button", { name: "Duplicate" }));
  await expectToast(page, "Copied");

  // The page shows the copy: same leg and box, its own carrier, prices and source.
  await expect(page).not.toHaveURL(original);
  await expect(
    page.getByRole("heading", { level: 2, name: `BEANR › TRMER · 40HC · ${other}` }),
  ).toBeVisible();
  await expect(page.getByLabel("Sell price (€)")).toHaveValue("1250.00");
  await expect(page.getByLabel("Buy price / cost (€)")).toHaveValue("800.00");
  await expectChosen(page.getByLabel("Rate source"), "spot");

  // The original is untouched.
  await page.goto(original);
  await expect(page.getByLabel("Sell price (€)")).toHaveValue("1000.00");
  await expectChosen(page.getByLabel("Rate source"), "contract");

  await takeOutOfCatalogue(page, line);
  await takeOutOfCatalogue(page, other);
});

test("a service that is not freight is duplicated through its whole form, filled in", async ({
  page,
}) => {
  const t = tag();
  const name = `E2E Dup customs ${t}`;
  await login(page);
  await newItem(page);
  await choose(page.getByLabel("Category"), { label: "Customs clearance" });
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Sell price (€)").fill("150");
  await page.getByLabel("Buy price / cost (€)").fill("90");
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, "Added to the catalogue");

  await open(page, `/settings/catalogue?q=${encodeURIComponent(name)}`);
  await page.getByRole("table").getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();

  // Every field comes filled in from the original; only the name and the price change.
  await page.getByRole("button", { name: "Duplicate" }).click();
  const dlg = page.getByRole("dialog");
  await expect(dlg.getByLabel("Name")).toHaveValue(name);
  await expect(dlg.getByLabel("Sell price (€)")).toHaveValue("150.00");
  await dlg.getByLabel("Name").fill(`${name} express`);
  await dlg.getByLabel("Sell price (€)").fill("210");
  await submit(page, dlg.getByRole("button", { name: "Save" }));
  await expectToast(page, "Added to the catalogue");
  await expect(dlg).toBeHidden();

  // Both are in the catalogue, the original as it was.
  await open(page, `/settings/catalogue?q=${encodeURIComponent(name)}`);
  const rows = page.getByRole("table").getByRole("link");
  await expect(rows).toHaveCount(2);
  await rows.filter({ hasText: `${name} express` }).click();
  await expect(page.getByLabel("Sell price (€)")).toHaveValue("210.00");
  await expect(page.getByLabel("Buy price / cost (€)")).toHaveValue("90.00");

  await takeOutOfCatalogue(page, name);
});
