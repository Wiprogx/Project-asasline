import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { choose, expectToast, fillMandatory, issue, login, open, submit, tag } from "./helpers";

async function line(page: Page, text: string, qty: string, unit: string) {
  await page.getByLabel("Line", { exact: true }).fill(text);
  await page.getByLabel("Qty").fill(qty);
  await page.getByLabel("Unit (EUR)").fill(unit);
  await submit(page, page.getByRole("button", { name: "Add line" }));
  await expectToast(page, "Line added");
  // The draft's new version comes with the row: issuing before it would be a stale version.
  await expect(page.getByRole("row").filter({ hasText: text })).toBeVisible();
}

test("part of an issued invoice is credited, never more than is left, and the rest after", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Credit Part ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/accounting");
  await choose(page.getByLabel("Customer", { exact: true }), { label: client });
  await page.getByRole("button", { name: "New invoice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Draft for ${client}`);
  await line(page, `Weighing ${t}`, "3", "100");
  await line(page, `Storage ${t}`, "1", "50");
  await issue(page);
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(/^INV\//);
  const invoiceUrl = page.url();

  // One of the three weighings given back.
  await page.getByRole("button", { name: "Credit part" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel(new RegExp(`Weighing ${t}`)).fill("1");
  await d.getByLabel("Reason").fill("One weighing was not done");
  await d.getByRole("button", { name: "Issue the credit note" }).click();
  await expect(heading).toHaveText(/^CN\//);
  await expect(page.getByRole("cell", { name: `Weighing ${t}` })).toBeVisible();
  await expect(page.getByRole("cell", { name: `Storage ${t}` })).toHaveCount(0);

  // Two left: the box offers no more than that; the full credit then takes what is left.
  await open(page, invoiceUrl);
  await page.getByRole("button", { name: "Credit part" }).click();
  await expect(d.getByText("2 of 3 left")).toBeVisible();
  await expect(d.getByLabel(new RegExp(`Weighing ${t}`))).toHaveAttribute("max", "2");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Credit this invoice" }).click();
  await d.getByLabel("Reason").fill("Cancelled by the customer");
  await d.getByLabel("Start a corrected draft with the same lines").uncheck();
  await d.getByRole("button", { name: "Issue the credit note" }).click();
  await expect(heading).toHaveText(/^CN\//);
  await open(page, invoiceUrl);
  await expect(page.getByRole("button", { name: "Credit part" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Credit this invoice" })).toHaveCount(0);
});
