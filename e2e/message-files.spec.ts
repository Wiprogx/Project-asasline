import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a booking's copy list goes on its e-mails, and what comes with a message is filed on the shipment", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Copies Client ${t}`;
  await page.addInitScript(() => {
    (window as unknown as { opened: string[] }).opened = [];
    window.open = (url?: string | URL) => {
      (window as unknown as { opened: string[] }).opened.push(String(url));
      return null;
    };
  });
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByLabel("Email").fill(`client.${t}@example.com`);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  const base = page.url();

  // The copy list on the booking.
  await open(page, `${base}/edit`);
  await page.getByLabel("Copy to (e-mails)").fill(`Boss.${t}@example.com; agent@example.com`);
  await submit(page, page.getByRole("button", { name: "Save booking" }));
  await expectToast(page, "Saved");

  // Every e-mail from the file starts with it, and the mail app gets it too.
  await open(page, `${base}/messages`);
  await expect(page.getByLabel("Copy to")).toHaveValue(`boss.${t}@example.com, agent@example.com`);
  await page
    .getByLabel("To a party on the file")
    .selectOption({ label: `${client} (Customer, Payer)` });
  await page.getByLabel("Subject").fill("Your booking");
  await page.getByLabel("Message", { exact: true }).fill("Please find the booking confirmation.");
  await submit(page, page.getByRole("button", { name: "Record and open to send" }));
  await expectToast(page, "Recorded");
  const opened = await page.evaluate(() => (window as unknown as { opened: string[] }).opened);
  expect(opened[0]).toContain(`&cc=boss.${t}%40example.com%2Cagent%40example.com`);
  await expect(page.getByText(`cc: boss.${t}@example.com, agent@example.com`)).toBeVisible();

  // What came with a message is on the message, and filed on the shipment by its name.
  await page.getByRole("button", { name: "Log a message received" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("From (name, e-mail or phone)").fill(`client.${t}@example.com`);
  await d.getByLabel("Subject").fill(`Facture ${t}`);
  await d.getByLabel("Attachments").setInputFiles({
    name: `Facture-${t}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%e2e\n"),
  });
  await submit(page, d.getByRole("button", { name: "Log it" }));
  await expectToast(page, `Logged — 1 file(s) filed on ${ref}`);
  const attachment = page.getByRole("link", { name: `📎 Facture-${t}.pdf` });
  await expect(attachment).toBeVisible();
  const res = await page.request.get((await attachment.getAttribute("href"))!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  await open(page, `${base}/documents`);
  const row = page.getByRole("row").filter({ hasText: `Facture-${t}.pdf` });
  await expect(row).toContainText("INVOICE");
});
