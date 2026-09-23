import { expect, test } from "@playwright/test";
import { expectToast, login, submit, tag } from "./helpers";

test("a template picked on a booking writes the letter from the file", async ({ page }) => {
  const t = tag();
  const code = `E2E_${t}`.toUpperCase().slice(0, 28);
  const client = `E2E Template Client ${t}`;
  await login(page);

  // A new template, with a placeholder the file cannot fill.
  await page.goto("/settings/templates");
  const fresh = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add template" }) });
  await fresh.getByLabel("Code").fill(code);
  await fresh.getByLabel("Name").fill(`Pick-up notice ${t}`);
  await fresh.getByLabel("Subject").fill("{ref} — pick-up");
  await fresh.getByLabel("Text").fill("Dear {client},\n{ref} leaves {pol} on {etd}.\n{me}");
  await submit(page, fresh.getByRole("button", { name: "Add template" }));
  await expectToast(page, `Pick-up notice ${t} saved`);

  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await page.goto("/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Sell (EUR)").fill("700");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const sb = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  await page.goto(`${page.url()}/messages`);
  await page.getByLabel("Template").selectOption({ label: `Pick-up notice ${t}` });
  await expect(page.getByLabel("Subject")).toHaveValue(`${sb} — pick-up`);
  await expect(page.getByLabel("Message")).toHaveValue(
    new RegExp(`^Dear ${client},\\n${sb} leaves BEANR on —\\.\\n`),
  );

  // Taken out of use: it no longer appears on the booking.
  await page.goto("/settings/templates");
  const mine = page.locator("form").filter({ has: page.locator(`input[value="${code}"]`) });
  await mine.getByLabel("In use").uncheck();
  await submit(page, mine.getByRole("button", { name: "Save" }));
  await expectToast(page, `Pick-up notice ${t} saved`);
});
