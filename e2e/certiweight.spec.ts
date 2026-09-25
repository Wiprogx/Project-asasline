import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

const stepRow = (page: Page, text: string | RegExp) =>
  page.getByRole("row").filter({ hasText: text });
const taskRow = (page: Page, text: string) => page.getByRole("listitem").filter({ hasText: text });

test("Certiweight is one step per container, the VGM waits on the weights, and the certificate locks the charge", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Certi Client ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  // Sold on the quotation: the booking gets the steps.
  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("GALBV");
  await page.getByLabel("Service").fill("Ocean freight + Certiweight");
  await page.getByLabel("Sell (EUR)").fill("4300");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  const quotation = page.url();
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const base = page.url();

  await open(page, `${base}/containers`);
  await submit(page, page.getByRole("button", { name: "Add container" }));
  await expectToast(page, /added/i);

  // The VGM rule waits on the weights (the office ticks it; a saved rule book keeps its own VGM row).
  await open(page, "/settings/rules");
  await page
    .getByRole("row")
    .filter({ hasText: "Confirm the VGM was sent" })
    .getByRole("button", { name: "Edit" })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Only once every box's weight is in").check();
  await submit(page, d.getByRole("button", { name: "Save rule" }));
  await expectToast(page, /re-planned/);

  // One Certiweight step per box; the VGM waits on both weights.
  await open(page, `${base}/documents`);
  await expect(stepRow(page, /CERTIWEIGHT · box 1/)).toBeVisible();
  await expect(stepRow(page, /CERTIWEIGHT · box 2/)).toBeVisible();
  await expect(stepRow(page, /Confirm the VGM was sent/)).toContainText("the weight of box 1");

  await open(page, `${base}/containers`);
  await page.getByLabel("Cargo kg").nth(0).fill("18000");
  await submit(page, page.getByRole("button", { name: "Save", exact: true }).nth(0));
  await expectToast(page, /saved/i);
  await page.getByLabel("Cargo kg").nth(1).fill("19000");
  await submit(page, page.getByRole("button", { name: "Save", exact: true }).nth(1));
  await expectToast(page, /saved/i);
  await open(page, `${base}/documents`);
  await expect(stepRow(page, /Confirm the VGM was sent/).getByText("Open")).toBeVisible();

  // Loading confirmed: the Certiweight steps open, one per box.
  await open(page, `${base}/tasks`);
  await submit(
    page,
    taskRow(page, "Confirm the container was loaded").getByRole("button", { name: "Done" }),
  );
  await expectToast(page, "Done");
  await open(page, `${base}/documents`);
  await expect(stepRow(page, /CERTIWEIGHT · box 1/).getByText("Open")).toBeVisible();

  // The certificate of box 1 settles box 1's step only.
  const option = page
    .getByLabel("Proves the step")
    .locator("option", { hasText: "Certiweight certificate — box 1" });
  const key = await option.getAttribute("value");
  await page.getByLabel("File", { exact: true }).setInputFiles({
    name: `certiweight-${t}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%e2e\n"),
  });
  await page.getByLabel("Proves the step").selectOption(key!);
  await submit(page, page.getByRole("button", { name: "File it" }));
  await expectToast(page, "Filed as CERTIWEIGHT — the step is done");
  await expect(stepRow(page, /CERTIWEIGHT · box 1/).getByText("Done")).toBeVisible();
  await expect(stepRow(page, /CERTIWEIGHT · box 2/).getByText("Open")).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Certiweight certificate — box 2" }),
  ).toContainText("Missing");

  // The weighing was done: the charge cannot leave the quotation.
  await open(page, quotation);
  await page
    .getByRole("row")
    .filter({ hasText: "Ocean freight + Certiweight" })
    .getByRole("button", { name: "Remove" })
    .click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("Customer changed his mind");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Remove" }));
  await expectToast(page, /the charge stays/);

  // A box that leaves the booking takes its step with it.
  await open(page, `${base}/containers`);
  await page.getByRole("button", { name: "Remove" }).last().click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("One box less");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Remove" }));
  await open(page, `${base}/documents`);
  await expect(stepRow(page, /CERTIWEIGHT · box 2/)).toHaveCount(0);
});
