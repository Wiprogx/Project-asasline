import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectToast, login, submit, tag } from "./helpers";

const officeToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());
const plusDays = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function bookingFromQuote(page: Page, client: string) {
  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByLabel("Country (ISO-2)").fill("BE");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await page.goto("/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Service").fill("Ocean freight Antwerp → Mersin");
  await page.getByLabel("Sell (EUR)").fill("1250");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  return page.url();
}

test("a booking is invoiced, the invoice issued, credited and re-drafted", async ({ page }) => {
  const t = tag();
  await login(page);
  const booking = await bookingFromQuote(page, `E2E Invoice Client ${t}`);

  // Billing: nothing invoiced yet; the quotation line is proposed in full.
  await page.goto(`${booking}/billing`);
  await expect(page.getByText("Not invoiced")).toBeVisible();
  await expect(page.getByRole("cell", { name: "1 / 1" })).toBeVisible();
  await page.getByRole("button", { name: "Create draft invoice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Draft for /);

  // An extra line at 21%: VAT is shown per rate, the exempt line keeps its legal mention.
  await page.getByLabel("Line", { exact: true }).fill("Administration fee");
  await page.getByLabel("Unit (EUR)").fill("100");
  await page.getByLabel("VAT", { exact: true }).selectOption("S21");
  await submit(page, page.getByRole("button", { name: "Add line" }));
  await expectToast(page, "Line added");
  await expect(page.getByText("VAT 21% on €100.00")).toBeVisible();
  await expect(page.getByText(/article 41 of the Belgian VAT Code/)).toBeVisible();
  await expect(page.getByText("€1,371.00")).toBeVisible();

  // Issue: the next number of the year, 30 days to pay, a structured reference.
  await page.getByLabel("Payment term").selectOption({ label: "30 days net" });
  await submit(page, page.getByRole("button", { name: "Issue invoice" }));
  await expectToast(page, /Issued as INV\/\d{4}\/\d{5}/);
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(/^INV\/\d{4}\/\d{5}$/);
  const number = (await heading.textContent())!.trim();
  await expect(page.getByText(plusDays(officeToday(), 30))).toBeVisible();
  await expect(page.getByText(/\+\+\+\d{3}\/\d{4}\/\d{5}\+\+\+/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Add line" })).toHaveCount(0); // frozen

  await page.goto(`${booking}/billing`);
  await expect(page.getByText("Invoiced", { exact: true })).toBeVisible();
  await expect(page.getByText("Everything on this booking is invoiced.")).toBeVisible();

  // Credit it, with a corrected draft: the credit note has its own series; the quantity returns.
  await page.getByRole("link", { name: number }).click();
  await page.getByRole("button", { name: "Credit this invoice" }).click();
  await page.getByLabel("Reason").fill("Wrong customer reference");
  await page.getByRole("dialog").getByRole("button", { name: "Issue the credit note" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Draft for /);
  await page.goto(`${booking}/billing`);
  await expect(page.getByText("Not invoiced")).toBeVisible();
  const cnLink = page.getByRole("link", { name: /^CN\/\d{4}\/\d{5}$/ });
  await expect(cnLink).toBeVisible();

  // The corrected draft is discarded with a reason; it never takes a number.
  await page.getByRole("link", { name: "draft" }).click();
  await page.getByRole("button", { name: "Discard draft" }).click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("Will re-invoice next month");
  await page.getByRole("dialog").getByRole("button", { name: "Discard" }).click();
  await expectToast(page, "Draft discarded");

  // The original says who credited it; the credit note prints with the letterhead.
  await page.goto(`${booking}/billing`);
  await page.getByRole("link", { name: number }).click();
  await expect(page.getByText(/credited by CN\//)).toBeVisible();
  await page.addInitScript(() => (window.print = () => undefined));
  await page.goto(`${booking}/billing`);
  const cnHref = await page.getByRole("link", { name: /^CN\// }).getAttribute("href");
  await page.goto(cnHref!.replace("/accounting/invoices/", "/print/invoices/"));
  await expect(page.getByText("ASASLINE S.A.")).toBeVisible();
  await expect(page.getByText("Credit note", { exact: true })).toBeVisible();
  await expect(page.getByText("Reason: Wrong customer reference")).toBeVisible();
});

test("an invoice number is never reused: numbers only go up", async ({ page }) => {
  const t = tag();
  await login(page);
  const numbers: string[] = [];
  for (const n of [1, 2]) {
    await page.goto("/accounting");
    await page.getByLabel("Customer", { exact: true }).selectOption({ index: 1 });
    await page.getByRole("button", { name: "New invoice" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Draft for /);
    await page.getByLabel("Line", { exact: true }).fill(`Storage ${t} #${n}`);
    await page.getByLabel("Unit (EUR)").fill("10");
    await submit(page, page.getByRole("button", { name: "Add line" }));
    // Wait for the line: issuing with the version from before it would be (rightly) refused.
    await expect(page.getByRole("cell", { name: `Storage ${t} #${n}` })).toBeVisible();
    await submit(page, page.getByRole("button", { name: "Issue invoice" }));
    await expectToast(page, /Issued as/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^INV\//);
    numbers.push((await page.getByRole("heading", { level: 1 }).textContent())!.trim());
  }
  const seq = numbers.map((x) => Number(x.split("/")[2]));
  expect(seq[1]).toBe(seq[0] + 1);
});
