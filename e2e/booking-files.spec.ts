import { expect, test } from "./fixtures";
import { expectToast, login, submit, tag } from "./helpers";

const stepRow = (page: import("@playwright/test").Page, code: string) =>
  page.getByRole("row").filter({ has: page.getByText(code, { exact: true }) });

test("a file is filed by its name, proves a document step, and is taken off with a reason", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Files Client ${t}`;
  await login(page);
  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await page.goto("/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("GALBV");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const base = page.url();

  // Gabon asks for its BIETC; the invoice waits on the request for it.
  await page.goto(`${base}/documents`);
  await expect(page.getByRole("heading", { name: /Required papers · \d+ missing/ })).toBeVisible();
  await expect(stepRow(page, "INVOICE").getByText("Waits on ASK_INV")).toBeVisible();

  // A file is filed by the words in its name.
  const pdf = {
    name: `Facture-${t}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%e2e\n"),
  };
  await page.getByLabel("File", { exact: true }).setInputFiles(pdf);
  await submit(page, page.getByRole("button", { name: "File it" }));
  await expectToast(page, "Filed as INVOICE");
  const row = page.getByRole("row").filter({ hasText: `Facture-${t}.pdf` });
  await expect(row).toContainText("INVOICE");
  await expect(row).toContainText("Final");

  // It opens from the office, with its name and type.
  const href = await row.getByRole("link").getAttribute("href");
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  expect(res.headers()["content-disposition"]).toContain(`Facture-${t}.pdf`);

  // A final paper filed against the request step settles it: the invoice step opens.
  await page
    .getByLabel("File", { exact: true })
    .setInputFiles({ ...pdf, name: `request-${t}.pdf` });
  await page.getByLabel("Proves the step").selectOption({ value: "ASK_INV" });
  await submit(page, page.getByRole("button", { name: "File it" }));
  await expectToast(page, "Filed as ASK_INV — the step is done");
  await expect(stepRow(page, "ASK_INV").getByText("Done")).toBeVisible();
  await expect(stepRow(page, "INVOICE").getByText("Open")).toBeVisible();
  // …and its task exists: the chain was re-planned, not only redrawn.
  await page.goto(`${base}/tasks`);
  await expect(
    page.getByRole("listitem").filter({ hasText: "Get the export invoice from the customer" }),
  ).toBeVisible();
  await page.goto(`${base}/documents`);

  // A kind of file the office does not keep is refused.
  await page.getByLabel("File", { exact: true }).setInputFiles({
    name: "setup.exe",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("MZ"),
  });
  await submit(page, page.getByRole("button", { name: "File it" }));
  await expectToast(page, /not a file the office keeps/);

  // Taken off with a reason: gone from the list, on the record.
  await row.getByRole("button", { name: "Take off" }).click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("Wrong booking");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Take off" }));
  await expectToast(page, "Taken off the booking");
  await expect(row).toHaveCount(0);
  await page.goto(`${base}/history`);
  await expect(page.getByText(/booking\.file\.archive|Wrong booking/)).toBeVisible();
});
