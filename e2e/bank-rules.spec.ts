import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

const officeToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());

test("the bank's fee is booked straight to its account by the office's rule", async ({ page }) => {
  const t = tag();
  await login(page);

  await open(page, "/settings/accounting");
  await expect(page.getByLabel("Bank matching rules, one per line")).toHaveValue(/Bank charges/);

  const csv = [
    "Rekening;Boekingsdatum;Bedrag;Naam tegenpartij;Rekening tegenpartij;Mededeling",
    `BE41068941625810;${officeToday()};-12,34;Belfius;;Frais de gestion ${t}`,
  ].join("\n");
  await open(page, "/accounting/bank");
  await page
    .getByLabel("Statement file (CODA or CSV)")
    .setInputFiles({ name: `fee-${t}.csv`, mimeType: "text/csv", buffer: Buffer.from(csv) });
  await submit(page, page.getByRole("button", { name: "Import statement" }));
  await expectToast(page, "1 line imported");

  const fee = page.getByRole("listitem").filter({ hasText: `Frais de gestion ${t}` });
  await expect(fee.getByText(/the office's rule/)).toBeVisible();
  await submit(page, fee.getByRole("button", { name: "Book as Bank charges (657000)" }));
  await expectToast(page, "Booked as Bank charges — 657000");
  await expect(fee.getByText("Matched")).toBeVisible();

  // It went through the bank, to the charges: the cash flow names it.
  await open(page, "/accounting/cash-flow");
  await expect(page.getByRole("table", { name: "Cash flow" })).toContainText(
    "Bank charges and finance",
  );
});
