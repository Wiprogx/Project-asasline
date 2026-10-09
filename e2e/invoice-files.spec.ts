import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a bill keeps the supplier's PDF, and it is taken off with a reason", async ({ page }) => {
  const t = tag();
  const supplier = `E2E Scanner ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(supplier);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: supplier })).toBeVisible();

  await open(page, "/accounting/bills");
  await page.getByLabel("Supplier", { exact: true }).selectOption({ label: supplier });
  await page.getByRole("button", { name: "New bill" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Bill from ${supplier}`);

  // The supplier's own PDF, kept with the bill.
  await expect(page.getByText("Nothing kept with this document yet.")).toBeVisible();
  await page.getByLabel("File", { exact: true }).setInputFiles({
    name: `scan-${t}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%e2e\n"),
  });
  await page.getByLabel("Note").fill("The supplier's PDF");
  await submit(page, page.getByRole("button", { name: "Attach", exact: true }));
  await expectToast(page, `Attached — scan-${t}.pdf`);
  const link = page.getByRole("link", { name: `scan-${t}.pdf` });
  await expect(link).toBeVisible();
  await expect(page.getByText("The supplier's PDF")).toBeVisible();
  const res = await page.request.get((await link.getAttribute("href"))!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");

  // Taken off with a reason: gone from the document, on the record.
  await page.getByRole("button", { name: "Take off" }).click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("Wrong document");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Take off" }));
  await expectToast(page, "Taken off the document");
  await expect(page.getByRole("link", { name: `scan-${t}.pdf` })).toHaveCount(0);
});
