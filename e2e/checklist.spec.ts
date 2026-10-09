import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("the export invoice is checked item by item; what it lacks becomes a task, and it closes once complete", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Checklist Client ${t}`;
  await login(page);

  await open(page, "/settings/checklists");
  await expect(page.getByText(/1 entries/)).toBeVisible();

  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("GALBV");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  const base = page.url();

  // The request is filed; the invoice step opens and is checked against its list.
  await open(page, `${base}/documents`);
  await page.getByLabel("File", { exact: true }).setInputFiles({
    name: `request-${t}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%e2e\n"),
  });
  await page.getByLabel("Proves the step").selectOption({ value: "ASK_INV" });
  await submit(page, page.getByRole("button", { name: "File it" }));
  await expectToast(page, "Filed as ASK_INV — the step is done");
  const invoice = page
    .getByRole("listitem")
    .filter({ has: page.getByText("INVOICE", { exact: true }) });
  await invoice.getByRole("button", { name: "Check the paper" }).click();
  const d = page.getByRole("dialog");
  for (const item of ["Headed Invoice — not a proforma", "Invoice date", "Container number"])
    await d.getByLabel(item).check();
  await submit(page, d.getByRole("button", { name: "Done checking" }));
  await expectToast(page, "INVOICE sent back — 5 items missing, each its own task");
  await expect(invoice.getByText(/missing: .*Seal number/)).toBeVisible();
  await open(page, `${base}/tasks`);
  await expect(
    page.getByRole("listitem").filter({ hasText: `Export invoice check: Seal number — ${ref}` }),
  ).toBeVisible();

  // Everything on the paper: the step is done.
  await open(page, `${base}/documents`);
  await invoice.getByRole("button", { name: "Check the paper" }).click();
  for (const box of await page.getByRole("dialog").getByRole("checkbox").all()) await box.check();
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Done checking" }));
  await expectToast(page, "INVOICE checked — Export invoice check complete");
  await expect(invoice.getByText("Checked ✓")).toBeVisible();
});
