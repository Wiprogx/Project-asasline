import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a seal says who put it on, from the Settings list", async ({ page }) => {
  const t = tag();
  const client = `E2E Seals Client ${t}`;
  await login(page);
  await open(page, "/settings/lists");
  await expect(page.getByRole("heading", { name: "Seal sources" })).toBeVisible();

  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const base = page.url();

  // A source the office does not know is refused; known ones are kept and read on the booking.
  await open(page, `${base}/containers`);
  await page.locator("#c0-seals").fill(`SL${t} (Pirate)`);
  await submit(page, page.getByRole("button", { name: "Save", exact: true }).first());
  await expectToast(page, /Seal source "Pirate" is not in Settings/);
  await page.locator("#c0-seals").fill(`SL${t} (Carrier), CU${t} (Customs)`);
  await submit(page, page.getByRole("button", { name: "Save", exact: true }).first());
  await expectToast(page, "Container saved");
  await open(page, base);
  await expect(page.getByText(`seals SL${t} · Carrier, CU${t} · Customs`)).toBeVisible();
});
