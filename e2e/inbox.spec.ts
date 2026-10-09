import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("every letter ends with the office's signature from Settings", async ({ page }) => {
  const t = tag();
  const client = `E2E Signed Client ${t}`;
  await page.addInitScript(() => {
    window.open = () => null;
  });
  await login(page);

  await open(page, "/settings/routing");
  await page.getByLabel("Signature").fill(`{me} — ASASLINE S.A. · E2E ${t}`);
  await submit(page, page.getByRole("button", { name: "Save inbox and signature" }));
  await expectToast(page, "Inbox and signature saved");

  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByLabel("Email").fill(`signed.${t}@example.com`);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);

  await open(page, `${page.url()}/messages`);
  await page
    .getByLabel("To a party on the file")
    .selectOption({ label: `${client} (Customer, Payer)` });
  await page.getByLabel("Subject").fill("Your booking");
  await page.getByLabel("Message", { exact: true }).fill("Please find the confirmation.");
  await submit(page, page.getByRole("button", { name: "Record and open to send" }));
  await expectToast(page, "Recorded");
  await expect(page.getByText(`— ASASLINE S.A. · E2E ${t}`)).toBeVisible();

  // Back to the legacy wording for the other journeys.
  await open(page, "/settings/routing");
  await page
    .getByLabel("Signature")
    .fill("{me} — ASASLINE S.A.\nRue de Douvres 115, 1070 Brussels · +32 23 15 14 15");
  await submit(page, page.getByRole("button", { name: "Save inbox and signature" }));
  await expectToast(page, "Inbox and signature saved");
});
