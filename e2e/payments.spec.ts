import { expect, type Page, test } from "@playwright/test";
import { expectToast, login, submit, tag } from "./helpers";

const officeToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());

/** An issued invoice of 1,250.00 (export, VAT-exempt), from a quotation → booking. */
async function issuedInvoice(page: Page, client: string) {
  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByLabel("Country (ISO-2)").fill("BE");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await page.goto("/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Sell (EUR)").fill("1250");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  await page.goto(`${page.url()}/billing`);
  await page.getByRole("button", { name: "Create draft invoice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Draft for /);
  await submit(page, page.getByRole("button", { name: "Issue invoice" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^INV\//);
  const ogm = (await page.getByText(/\+\+\+\d{3}\/\d{4}\/\d{5}\+\+\+/).textContent())!.match(
    /\+\+\+\d{3}\/\d{4}\/\d{5}\+\+\+/,
  )![0];
  return {
    url: page.url(),
    number: (await page.getByRole("heading", { level: 1 }).textContent())!.trim(),
    ogm,
  };
}

const payments = (page: Page) => page.getByRole("heading", { name: /^Payments/ });

test("an invoice is paid by hand and by the bank, and a reversal reopens it", async ({ page }) => {
  const t = tag();
  await login(page);
  const inv = await issuedInvoice(page, `E2E Pay Client ${t}`);

  // Part paid in cash: the rest stays open.
  await page.getByLabel("Amount (EUR)").fill("250");
  await page.getByLabel("How").selectOption("cash");
  await submit(page, page.getByRole("button", { name: "Register payment" }));
  await expectToast(page, `Payment booked on ${inv.number}`);
  await expect(payments(page)).toContainText("Partly paid");
  await expect(payments(page)).toContainText("€1,000.00 open");

  // More than is open is refused.
  await page.getByLabel("Amount (EUR)").fill("2000");
  await submit(page, page.getByRole("button", { name: "Register payment" }));
  await expectToast(page, /Only 1000.00 is open/);

  // The bank statement: the rest, with the structured reference, a fee, and a stranger.
  const csv = [
    "Rekening;Boekingsdatum;Bedrag;Naam tegenpartij;Rekening tegenpartij;Mededeling",
    `BE41068941625810;${officeToday()};1000,00;Client ${t};;${inv.ogm}`,
    `BE41068941625810;${officeToday()};-12,34;Belfius;;Frais de compte ${t}`,
    `BE41068941625810;${officeToday()};77,77;Someone ${t};;no reference`,
  ].join("\n");
  const file = { name: `statement-${t}.csv`, mimeType: "text/csv", buffer: Buffer.from(csv) };

  await page.goto("/accounting/bank");
  await page.getByLabel("Statement file (CODA or CSV)").setInputFiles(file);
  await submit(page, page.getByRole("button", { name: "Import statement" }));
  await expectToast(page, "3 lines imported");
  await page.getByLabel("Statement file (CODA or CSV)").setInputFiles(file);
  await submit(page, page.getByRole("button", { name: "Import statement" }));
  await expectToast(page, "0 lines imported · 3 already there");

  const ours = page.getByRole("listitem").filter({ hasText: `Client ${t}` });
  await expect(ours.getByText(/sure: structured communication/)).toBeVisible();
  await submit(page, page.getByRole("button", { name: "Match the sure ones" }));
  await expectToast(page, /\d+ matched/);
  await expect(ours.getByText("Matched")).toBeVisible();

  // The fee pays no invoice: set aside with a reason.
  const fee = page.getByRole("listitem").filter({ hasText: `Frais de compte ${t}` });
  await fee.getByRole("button", { name: "Set aside" }).click();
  await page
    .getByPlaceholder("Why? It stays on the record.")
    .fill("Bank fee — booked with the charges");
  await page.getByRole("dialog").getByRole("button", { name: "Set aside" }).click();
  await expectToast(page, "Line set aside");

  await page.goto(inv.url);
  await expect(payments(page)).toContainText("Paid");
  await expect(page.getByRole("button", { name: "Register payment" })).toHaveCount(0);

  // Reverse the bank payment: the invoice opens again and the line waits to be matched again.
  const bankPay = page.getByRole("listitem").filter({ hasText: inv.ogm });
  await bankPay.getByRole("button", { name: "Reverse" }).click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("Booked on the wrong invoice");
  await page.getByRole("dialog").getByRole("button", { name: "Reverse" }).click();
  await expectToast(page, "Payment reversed");
  await expect(payments(page)).toContainText("Partly paid");
  await expect(page.getByText("Reversed").first()).toBeVisible();
  await page.goto("/accounting/bank");
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: `Client ${t}` })
      .getByRole("button", { name: `Pays ${inv.number}` }),
  ).toBeVisible();
});
