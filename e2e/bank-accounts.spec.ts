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

  // A CODA statement says what the bank holds: one more line of 50.00, and a closing of 1,200.00
  // where ours would be 1,137.66 — a statement is missing, and the screen says so.
  const rec = (parts: [number, string][]) => {
    const a = new Array<string>(128).fill(" ");
    for (const [p, str] of parts)
      for (let k = 0; k < str.length && p - 1 + k < 128; k++) a[p - 1 + k] = str[k];
    return a.join("");
  };
  const d = officeToday();
  const ddmmyy = `${d.slice(8, 10)}${d.slice(5, 7)}${d.slice(2, 4)}`;
  const coda = [
    rec([[1, "0000023092672505"]]),
    rec([
      [1, "1"],
      [6, `${iban} EUR`],
    ]),
    rec([
      [1, "21"],
      [3, "0001"],
      [7, "0000"],
      [32, "0"],
      [33, "000000000050000"],
      [48, ddmmyy],
      [62, "0"],
      [63, `Interest ${t}`],
      [116, ddmmyy],
    ]),
    rec([
      [1, "8"],
      [42, "0"],
      [43, "000000001200000"],
      [58, ddmmyy],
    ]),
  ].join("\n");
  await page.getByLabel("Statement file (CODA or CSV)").setInputFiles({
    name: `statement-${t}.cod`,
    mimeType: "text/plain",
    buffer: Buffer.from(coda),
  });
  await submit(page, page.getByRole("button", { name: "Import statement" }));
  await expectToast(
    page,
    /1 line imported · ⚠ the balance differs by -€62\.34 — a statement is missing/,
  );
  await expect(card).toContainText("€1,137.66");
  await expect(card).toContainText(`The bank's last statement says (${d})`);
  await expect(card).toContainText("€1,200.00");
  await expect(card.getByRole("status")).toContainText(
    "€62.34 apart from the bank — a statement is missing.",
  );
});
