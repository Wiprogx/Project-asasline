import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a milestone ticked writes the customer by itself, once; the Calls tab and the WhatsApp numbers are there", async ({
  page,
}) => {
  const t = tag();
  await login(page);

  // Automatic sending is on, on both channels; the WhatsApp numbers are a Settings table.
  await open(page, "/settings/routing");
  await expect(page.getByLabel("Send tracking updates without asking")).toBeChecked();
  const numbers = page.getByLabel("WhatsApp numbers, one per line");
  await expect(numbers).toHaveValue(/ASASLINE — main \| \+32 23 15 14 15 \|  \| yes/);

  // A customer with an e-mail address and no WhatsApp: the news goes by e-mail.
  const client = `E2E Auto Send ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByLabel("Email").fill(`news.${t}@example.com`);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const id = page.url().split("/bookings/")[1];

  await open(page, `/bookings/${id}/tracking`);
  const sailed = page.getByRole("listitem").filter({ hasText: "Vessel departure" });
  await submit(page, sailed.getByRole("button", { name: "Confirm" }));
  await expectToast(page, /Journey updated/);
  await open(page, `/bookings/${id}/messages`);
  const news = page
    .getByRole("listitem")
    .filter({ hasText: "sailed" })
    .filter({ hasText: "automatically" });
  await expect(news).toHaveCount(1);
  await expect(news).toContainText(`Admin → ${client}`);
  await expect(news).toContainText("Sent automatically");

  // Unticked and ticked again: the same news is not sent twice.
  await open(page, `/bookings/${id}/tracking`);
  await submit(page, sailed.getByRole("button", { name: "Undo" }));
  await expectToast(page, /Journey updated/);
  await submit(page, sailed.getByRole("button", { name: "Confirm" }));
  await expectToast(page, /Journey updated/);
  await open(page, `/bookings/${id}/messages`);
  await expect(page.getByRole("listitem").filter({ hasText: "automatically" })).toHaveCount(1);

  // The Calls tab is the calls alone.
  await open(page, "/discuss/all");
  await page.getByRole("link", { name: "Calls" }).click();
  await expect(page).toHaveURL(/channel=call/);
});
