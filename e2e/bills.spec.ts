import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

const officeToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());

async function contact(page: Page, name: string) {
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

async function addLine(page: Page, text: string, eur: string, account?: string) {
  await page.getByLabel("Line", { exact: true }).fill(text);
  await page.getByLabel("Unit (EUR)").fill(eur);
  if (account) await page.getByLabel("Account").selectOption(account);
  await submit(page, page.getByRole("button", { name: "Add line" }));
  await expect(page.getByRole("cell", { name: text })).toBeVisible();
}

async function recordBill(page: Page, ref: string) {
  await page.getByLabel("Supplier's number").fill(ref);
  await submit(page, page.getByRole("button", { name: "Record bill" }));
}

test("a large bill needs a second person before it is paid, then the bank pays it", async ({
  page,
  browser,
}) => {
  const t = tag();
  const supplier = `E2E Landlord ${t}`;
  const ref = `F-${t}`;
  await login(page);
  await contact(page, supplier);

  await open(page, "/accounting/bills");
  await page.getByLabel("Supplier", { exact: true }).selectOption({ label: supplier });
  await page.getByRole("button", { name: "New bill" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Bill from ${supplier}`);
  await addLine(page, "Warehouse rent, October", "6000", "610000");
  await recordBill(page, ref);
  await expectToast(page, /needs a second person's approval/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^BILL\/\d{4}\/\d{5}$/);
  const billUrl = page.url();

  // Not payable yet, and the one who recorded it cannot approve it.
  await submit(page, page.getByRole("button", { name: "Register payment" }));
  await expectToast(page, /second person must approve/);
  await submit(page, page.getByRole("button", { name: "Approve for payment" }));
  await expectToast(page, /not the one who recorded it/);

  // A second person — an Accountant — approves.
  const email = `acct.${t}@e2e.test`;
  const password = `pw-${t}-${t}`;
  await open(page, "/settings/people");
  await page.getByLabel("Name").fill(`Accountant ${t}`);
  await page.getByLabel("Email").fill(email);
  await page.locator("#p-role").selectOption("accountant"); // the add-person form, not a staff row
  await page.getByLabel("First password").fill(password);
  await submit(page, page.getByRole("button", { name: "Add person" }));
  const other = await (await browser.newContext()).newPage();
  await login(other, { email, password });
  await open(other, billUrl);
  await submit(other, other.getByRole("button", { name: "Approve for payment" }));
  await expectToast(other, "Approved — it can be paid");

  // The bank pays it: money going out, matched by the supplier's own number.
  const csv = [
    "Boekingsdatum;Bedrag;Naam tegenpartij;Mededeling",
    `${officeToday()};-7260,00;${supplier};Facture ${ref}`,
  ].join("\n");
  await open(page, "/accounting/bank");
  await page
    .getByLabel("Statement file (CODA or CSV)")
    .setInputFiles({ name: `out-${t}.csv`, mimeType: "text/csv", buffer: Buffer.from(csv) });
  await submit(page, page.getByRole("button", { name: "Import statement" }));
  await expectToast(page, "1 line imported");
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: `Facture ${ref}` })
      .getByText(/the supplier's number/),
  ).toBeVisible();
  await submit(page, page.getByRole("button", { name: "Match the sure ones" }));
  await open(page, billUrl);
  await expect(page.getByRole("heading", { name: /^Payments/ })).toContainText("Paid");

  // The same supplier number cannot be recorded twice.
  await open(page, "/accounting/bills");
  await page.getByLabel("Supplier", { exact: true }).selectOption({ label: supplier });
  await page.getByRole("button", { name: "New bill" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Bill from ${supplier}`);
  await addLine(page, "Same rent again", "6000", "610000");
  await recordBill(page, ref);
  await expectToast(page, `This supplier's ${ref} is already recorded`);
});

test("a supplier bill on a booking is its cost, and the margin follows", async ({ page }) => {
  const t = tag();
  const client = `E2E Margin Client ${t}`;
  const haulier = `E2E Haulier ${t}`;
  await login(page);
  await contact(page, client);
  await contact(page, haulier);
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const billing = `${page.url()}/billing`;

  await open(page, billing);
  await page.getByLabel("Supplier", { exact: true }).selectOption({ label: haulier });
  await page.getByRole("button", { name: "Record a supplier bill" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Bill from ${haulier}`);
  await expect(page.getByLabel("Account")).toHaveValue("604000"); // a shipment cost by default
  await addLine(page, "Trucking Antwerp", "400");
  await recordBill(page, `T-${t}`);
  await expectToast(page, /Recorded as BILL\//);

  await open(page, billing);
  await expect(page.getByText(/costs €400\.00 · margin [−-]?€[−-]?400\.00/)).toBeVisible();
});
