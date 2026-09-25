import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("the ports table is edited and offered on the port fields", async ({ page }) => {
  const code = `ZZ${tag().slice(-3).toUpperCase().replace(/[01]/g, "X")}`;
  await login(page);
  await open(page, "/settings/ports");
  const box = page.getByLabel("Ports, one per line");
  const before = await box.inputValue();
  await box.fill(`${before}\n${code} Test port ZZ`);
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, /Saved · \d+ ports/);
  await open(page, "/bookings/new");
  await expect(page.locator(`datalist#ports option[value="${code}"]`)).toHaveCount(1);
  await expect(page.getByLabel("Port of loading")).toHaveAttribute("list", "ports");
  // A bad line is refused, by number.
  await open(page, "/settings/ports");
  await page.getByLabel("Ports, one per line").fill("BEANR Antwerp BE\nnot a port");
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, /Line 2: expected/);
  await page.getByLabel("Ports, one per line").fill(before);
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, /Saved/);
});

test("a filing rule saved in Settings files the next upload", async ({ page }) => {
  const t = tag();
  await login(page);
  await open(page, "/settings/filing");
  const box = page.getByLabel("Filing rules, one per line");
  const before = await box.inputValue();
  await box.fill(
    `${before}\nweighbridge ${t} → WEIGH${t.slice(-3).toUpperCase().replace(/\d/g, "X")}`,
  );
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, /Saved · \d+ rules/);
  await page.getByLabel("Filing rules, one per line").fill("no arrow here");
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, /Each line reads/);
  await page.getByLabel("Filing rules, one per line").fill(before);
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, /Saved/);
});

test("the permission matrix is edited, and the Admin keeps Settings", async ({ page }) => {
  await login(page);
  await open(page, "/settings/permissions");
  await expect(page.getByLabel("Admin — app.settings")).toBeDisabled();
  const cell = page.getByLabel("Docs clerk — catalogue.edit");
  const was = await cell.isChecked();
  await cell.setChecked(!was);
  await submit(page, page.getByRole("button", { name: "Save permissions" }));
  await expectToast(page, "Permissions saved");
  await open(page, "/settings/permissions");
  await expect(page.getByLabel("Docs clerk — catalogue.edit")).toBeChecked({ checked: !was });
  await page.getByLabel("Docs clerk — catalogue.edit").setChecked(was);
  await submit(page, page.getByRole("button", { name: "Save permissions" }));
  await expectToast(page, "Permissions saved");
});

test("the links report opens", async ({ page }) => {
  await login(page);
  await open(page, "/settings/links");
  await expect(page.getByText("Shipping lines and their office here")).toBeVisible();
  await expect(page.getByText("Bookings with no quotation behind them")).toBeVisible();
  await expect(page.getByText("Customers shipping without a VAT number")).toBeVisible();
});
