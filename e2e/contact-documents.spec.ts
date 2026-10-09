import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a contact's Documents tab lists what is filed on its shipments", async ({ page }) => {
  const t = tag();
  const client = `E2E Papers Client ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  const contact = page.url();

  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  await open(page, `${page.url()}/documents`);
  await page.getByLabel("File", { exact: true }).setInputFiles({
    name: `Facture-${t}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%e2e\n"),
  });
  await submit(page, page.getByRole("button", { name: "File it" }));
  await expectToast(page, "Filed as INVOICE");

  await open(page, contact);
  await page
    .getByRole("navigation", { name: "Section" })
    .getByRole("link", { name: "Documents" })
    .click();
  const row = page.getByRole("row").filter({ hasText: `Facture-${t}.pdf` });
  await expect(row).toContainText("INVOICE");
  await expect(row.getByRole("link", { name: ref })).toBeVisible();
  const res = await page.request.get(
    (await row.getByRole("link", { name: /Facture/ }).getAttribute("href"))!,
  );
  expect(res.status()).toBe(200);
});
