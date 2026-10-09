import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

const stepRow = (page: import("@playwright/test").Page, code: string) =>
  page.getByRole("row").filter({ has: page.getByText(code, { exact: true }) });

test("a paper is sent back with a reason and its step reopens; a corrected one is checked; the invoice is checked against its list", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Review Client ${t}`;
  await login(page);
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
  const base = page.url();

  // The request for the invoice is filed and settles its step.
  await open(page, `${base}/documents`);
  const pdf = {
    name: `request-${t}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%e2e\n"),
  };
  await page.getByLabel("File", { exact: true }).setInputFiles(pdf);
  await page.getByLabel("Proves the step").selectOption({ value: "ASK_INV" });
  await submit(page, page.getByRole("button", { name: "File it" }));
  await expectToast(page, "Filed as ASK_INV — the step is done");
  const paper = page
    .getByRole("listitem")
    .filter({ has: page.getByText("ASK_INV", { exact: true }) });
  await expect(paper.getByText("Filed", { exact: true })).toBeVisible();
  await expect(stepRow(page, "INVOICE").getByText("Open", { exact: true })).toBeVisible();

  // Sent back with a reason: the word shows, the step is open again, the next one waits again.
  await paper.getByRole("button", { name: "Send back" }).click();
  await page
    .getByPlaceholder("Why? It stays on the record.")
    .fill("Wrong consignee on the request");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Send back" }));
  await expectToast(page, "ASK_INV sent back — the step is open again");
  await expect(paper.getByText("Sent back", { exact: true })).toBeVisible();
  await expect(paper.getByText(/Wrong consignee on the request/)).toBeVisible();
  await expect(stepRow(page, "ASK_INV").getByText("Open", { exact: true })).toBeVisible();
  await expect(stepRow(page, "INVOICE").getByText("Waits on ASK_INV")).toBeVisible();

  // A corrected copy filed after the word asks for a new look, and is checked.
  await page
    .getByLabel("File", { exact: true })
    .setInputFiles({ ...pdf, name: `request-v2-${t}.pdf` });
  await page.getByLabel("Proves the step").selectOption({ value: "ASK_INV" });
  await submit(page, page.getByRole("button", { name: "File it" }));
  await expectToast(page, "Filed as ASK_INV — the step is done");
  await expect(paper.getByText("Filed", { exact: true })).toBeVisible();
  await submit(page, paper.getByRole("button", { name: "Checked" }));
  await expectToast(page, "ASK_INV checked");
  await expect(paper.getByText("Checked ✓")).toBeVisible();

  // The invoice is checked against its list; everything ticked, the step is done.
  const invoice = page
    .getByRole("listitem")
    .filter({ has: page.getByText("INVOICE", { exact: true }) });
  await invoice.getByRole("button", { name: "Check the paper" }).click();
  for (const box of await page.getByRole("dialog").getByRole("checkbox").all()) await box.check();
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Done checking" }));
  await expectToast(page, "INVOICE checked — Export invoice check complete");
  await expect(stepRow(page, "INVOICE").getByText("Done")).toBeVisible();
});
