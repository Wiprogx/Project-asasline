import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

const officeToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(new Date());

/** A valid Belgian IBAN no other run uses: the BBAN's check is mod 97, the IBAN's 98 − mod 97. */
function uniqueIban(): string {
  const mod97 = (s: string) => {
    let r = 0;
    for (const ch of s) r = (r * 10 + Number(ch)) % 97;
    return r;
  };
  const basic = String(Math.floor(Math.random() * 1e10)).padStart(10, "0");
  const bban = basic + String(mod97(basic) || 97).padStart(2, "0");
  const check = 98 - mod97(`${bban}111400`);
  return `BE${String(check).padStart(2, "0")}${bban}`;
}

test("the office's bank accounts are a Settings table, and the Bank screen stands each against the books", async ({
  page,
}) => {
  const t = tag();
  const iban = uniqueIban();
  await login(page);

  await open(page, "/settings/accounting");
  const box = page.getByLabel("Bank accounts, one per line");
  const before = await box.inputValue();
  await box.fill(
    `${before ? `${before}\n` : ""}E2E Bank ${t} | ${iban} | GKCCBEBB | 550000 | 100.00 | 2026-01-01`,
  );
  await submit(page, page.getByRole("button", { name: "Save bank accounts" }));
  await expectToast(page, /Saved · \d+ bank accounts/);

  // Two lines on this account: the statement balance follows them from the opening.
  const csv = [
    "Rekening;Boekingsdatum;Bedrag;Naam tegenpartij;Rekening tegenpartij;Mededeling",
    `${iban};${officeToday()};1000,00;Client ${t};;payment ${t}`,
    `${iban};${officeToday()};-12,34;Belfius;;Frais ${t}`,
  ].join("\n");
  await open(page, "/accounting/bank");
  await page
    .getByLabel("Statement file (CODA or CSV)")
    .setInputFiles({ name: `statement-${t}.csv`, mimeType: "text/csv", buffer: Buffer.from(csv) });
  await submit(page, page.getByRole("button", { name: "Import statement" }));
  await expectToast(page, "2 lines imported");
  const card = page.locator("[data-slot=card]").filter({ hasText: `E2E Bank ${t}` });
  await expect(card).toContainText("Balance on the statements");
  await expect(card).toContainText("€1,087.66");
  await expect(card).toContainText("Balance in the books (550000)");
  await expect(card).toContainText("2 · €987.66");
});
