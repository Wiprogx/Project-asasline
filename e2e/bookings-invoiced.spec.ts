import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("the bookings list says what a shipment is worth and whether it is invoiced", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Listed Client ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByLabel("Country (ISO-2)").fill("BE");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Service").fill("Ocean freight Antwerp → Mersin");
  await page.getByLabel("Sell (EUR)").fill("1250");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  const booking = page.url();

  // Worth €1,250, not invoiced: in the "not invoiced" view, not in the "invoiced" one.
  const row = () => page.getByRole("row").filter({ hasText: ref });
  await open(page, `/bookings?q=${ref}&billing=not`);
  await expect(row()).toContainText("€1,250.00");
  await expect(row().getByText("Not invoiced")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Invoiced" })).toBeVisible();
  await expect(page.getByRole("term").filter({ hasText: "Waiting for an invoice" })).toBeVisible();
  await open(page, `/bookings?q=${ref}&billing=done`);
  await expect(page.getByText("No bookings match.")).toBeVisible();

  // Issued in full: the list follows at once.
  await open(page, `${booking}/billing`);
  await page.getByRole("button", { name: "Create draft invoice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Draft for /);
  await submit(page, page.getByRole("button", { name: "Issue invoice" }));
  await expectToast(page, /Issued as INV/);
  await open(page, `/bookings?q=${ref}&billing=done`);
  await expect(row().getByText("Invoiced", { exact: true })).toBeVisible();
  await open(page, `/bookings?q=${ref}&billing=open`);
  await expect(page.getByText("No bookings match.")).toBeVisible();
});
