import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a contract is kept on the contact itself, opened, and taken off with a reason", async ({
  page,
}) => {
  const t = tag();
  const name = `E2E Own Files ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const url = page.url();

  await open(page, `${url}/documents`);
  await page.getByLabel("Kind of paper").selectOption("Contract");
  await page.getByLabel("File").setInputFiles({
    name: `contract-${t}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 contract"),
  });
  await page.getByLabel("Note").fill("Signed in February");
  await submit(page, page.getByRole("button", { name: "Keep on the contact" }));
  await expectToast(page, `Kept — contract-${t}.pdf`);

  const row = page.getByRole("row").filter({ hasText: `contract-${t}.pdf` });
  await expect(row).toContainText("Contract");
  await expect(row).toContainText("The contact");
  const href = await row
    .getByRole("link", { name: new RegExp(`contract-${t}`) })
    .getAttribute("href");
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
  expect(await res.text()).toBe("%PDF-1.4 contract");

  await row.getByRole("button", { name: "Remove" }).click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("Replaced by the new contract");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Take it off" }));
  await expectToast(page, "Taken off the contact");
  await expect(page.getByRole("row").filter({ hasText: `contract-${t}.pdf` })).toHaveCount(0);
});
