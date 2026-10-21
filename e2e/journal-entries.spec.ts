import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("an entry is written by hand only when it balances, shows in the journal, and is reversed, not edited", async ({
  page,
}) => {
  const t = tag();
  const label = `E2E correction ${t}`;
  await login(page);
  await open(page, "/accounting/entries");

  await page.getByLabel("What it is for").fill(label);
  await page.getByLabel("Lines").fill("612000 | 100 | | Rent\n440000 | | 90 | Supplier");
  await submit(page, page.getByRole("button", { name: "Book the entry" }));
  await expectToast(page, "The entry does not balance: debits and credits differ by 10.00.");

  await page.getByLabel("Lines").fill("612000 | 100 | | Rent\n440000 | | 100 | Supplier");
  await submit(page, page.getByRole("button", { name: "Book the entry" }));
  await expectToast(page, /Booked as OD\/\d{4}\/\d{5}/);
  const item = page.getByRole("listitem").filter({ hasText: label });
  await expect(item).toContainText("€100.00");

  await open(page, `/accounting/journal?q=${encodeURIComponent(label)}`);
  await expect(page.getByText(label)).toBeVisible();

  await open(page, "/accounting/entries");
  await item.getByRole("button", { name: "Reverse" }).click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("Booked on the wrong account");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Reverse it" }));
  await expectToast(page, /Reversed by OD\//);
  await expect(item).toContainText("Reversed by OD/");
  await expect(item.getByRole("button", { name: "Reverse" })).toHaveCount(0);
});
