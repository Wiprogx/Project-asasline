import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("an account added to the chart in Settings is booked to and named everywhere", async ({
  page,
}) => {
  const t = tag();
  const name = `Insurance ${t}`;
  await login(page);
  await open(page, "/settings/accounting");
  const box = page.getByLabel("Chart of accounts, one per line");
  const lines = (await box.inputValue()).split("\n").filter((l) => !l.startsWith("616000"));
  await box.fill([...lines, `616000 | ${name}`].join("\n"));
  await submit(page, page.getByRole("button", { name: "Save the chart" }));
  await expectToast(page, /Saved · \d+ accounts/);

  // The books' own accounts cannot be taken out.
  await box.fill(lines.filter((l) => !l.startsWith("550000")).join("\n"));
  await submit(page, page.getByRole("button", { name: "Save the chart" }));
  await expectToast(page, /The books post to 550000/);

  await open(page, "/accounting/entries");
  await page.getByLabel("What it is for").fill(`Policy ${t}`);
  await page.getByRole("textbox", { name: "Lines" }).fill("616000 | 300 | |\n550000 | | 300 |");
  await submit(page, page.getByRole("button", { name: "Book the entry" }));
  await expectToast(page, /Booked as OD\//);
  await expect(page.getByRole("listitem").filter({ hasText: `Policy ${t}` })).toContainText(name);

  await open(page, "/accounting/ledger/616000");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`616000 ${name}`);
});
