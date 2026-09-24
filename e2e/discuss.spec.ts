import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectToast, login, submit, tag } from "./helpers";

async function contact(page: Page, name: string, email?: string) {
  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(name);
  if (email) await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

async function booking(page: Page, client: string) {
  await page.goto("/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByRole("button", { name: "Create booking" }).click();
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(/^SB/);
  return { ref: (await heading.textContent())!.trim(), url: page.url() };
}

async function logIncoming(
  page: Page,
  f: {
    from: string;
    contact?: string;
    ref?: string;
    topic?: string;
    subject: string;
    body?: string;
  },
) {
  await page.getByRole("button", { name: "Log a message received" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("From (name, e-mail or phone)").fill(f.from);
  if (f.contact) await d.getByLabel("Contact").selectOption({ label: f.contact });
  if (f.ref) await d.getByLabel("Booking or quotation no.").fill(f.ref);
  if (f.topic) await d.getByLabel("About").selectOption({ label: f.topic });
  await d.getByLabel("Subject").fill(f.subject);
  if (f.body) await d.getByLabel("Message").fill(f.body);
  await submit(page, d.getByRole("button", { name: "Log it" }));
  await expectToast(page, "Logged");
}

test("internal chat links a bare booking number", async ({ page }) => {
  const t = tag();
  await login(page);
  await contact(page, `E2E Chat Client ${t}`);
  const b = await booking(page, `E2E Chat Client ${t}`);
  await page.goto("/discuss/room/office");
  await page
    .getByLabel("Message", { exact: true })
    .fill(`${b.ref.toLowerCase()} vgm 31200 kgs ${t}`);
  await submit(page, page.getByRole("button", { name: "Send" }));
  await expectToast(page, "Posted");
  const item = page.getByRole("listitem").filter({ hasText: `vgm 31200 kgs ${t}` });
  await expect(item.getByRole("link", { name: b.ref })).toBeVisible();
});

test("a message waits in its role's queue until someone takes it", async ({ page }) => {
  const t = tag();
  const subject = `Payment question ${t}`;
  await login(page);
  await page.goto("/discuss/queue");
  await logIncoming(page, {
    from: "someone@example.com",
    topic: "An invoice or a payment",
    subject,
  });

  // Routed to the Accountant role: not in the Admin's own queue, but in the all-roles view.
  await page.reload();
  await expect(page.getByText(subject)).toHaveCount(0);
  await page.goto("/discuss/queue?all=1");
  const item = page.getByRole("listitem").filter({ hasText: subject });
  await expect(item.getByText("Accountant")).toBeVisible();
  await submit(page, item.getByRole("button", { name: "Take it" }));
  await expectToast(page, "Yours now");
  await page.reload();
  await expect(page.getByText(subject)).toHaveCount(0);
});

test("writing from a booking stamps the subject key, and a reply finds its way back", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Mail Client ${t}`;
  const stranger = `E2E Stranger ${t}`;
  // Capture what the app hands to the mail client instead of opening one.
  await page.addInitScript(() => {
    (window as unknown as { opened: string[] }).opened = [];
    window.open = (url?: string | URL) => {
      (window as unknown as { opened: string[] }).opened.push(String(url));
      return null;
    };
  });
  await login(page);
  await contact(page, client, `client.${t}@example.com`);
  await contact(page, stranger);
  const b = await booking(page, client);

  await page.goto(`${b.url}/messages`);
  await page
    .getByLabel("To a party on the file")
    .selectOption({ label: `${client} (Customer, Payer)` });
  await expect(page.getByLabel("E-mail address")).toHaveValue(`client.${t}@example.com`);
  await page.getByLabel("Subject").fill("Your booking");
  await page.getByLabel("Message", { exact: true }).fill("Please send the invoice.");
  await submit(page, page.getByRole("button", { name: "Record and open to send" }));
  await expectToast(page, "Recorded");
  const opened = await page.evaluate(() => (window as unknown as { opened: string[] }).opened);
  // The mail app gets the recipient and the subject with its key: [SBxxxxxxx/MSG].
  expect(
    opened[0].startsWith(`mailto:client.${t}%40example.com?subject=%5B${b.ref}%2FMSG%5D`),
  ).toBe(true);
  await expect(page.getByText(`[${b.ref}/MSG] Your booking`)).toBeVisible();
  await expect(page.getByText("Recorded — not sent by the app")).toBeVisible();

  // The reply carries the key: logged anywhere, it lands on this booking.
  await page.goto("/discuss/queue");
  await logIncoming(page, {
    from: `client.${t}@example.com`,
    contact: client,
    subject: `Re: [${b.ref}/MSG] Your booking`,
    body: `Invoice attached ${t}`,
  });
  await page.goto(`${b.url}/messages`);
  await expect(page.getByText(`Invoice attached ${t}`)).toBeVisible();

  // Message guard: a contact who is not a party on the booking is flagged.
  await logIncoming(page, {
    from: "who?",
    contact: stranger,
    ref: b.ref,
    subject: `About your shipment ${t}`,
  });
  const flagged = page.getByRole("listitem").filter({ hasText: `About your shipment ${t}` });
  await expect(flagged.getByText(/Sender is not a party on/)).toBeVisible();
});

test("a message appears on a colleague's open screen without a reload", async ({
  page,
  browser,
}) => {
  const t = tag();
  await login(page);
  const other = await (await browser.newContext()).newPage();
  await login(other);
  await other.goto("/discuss/room/office");
  await expect(other.getByLabel("Message", { exact: true })).toBeVisible();

  await page.goto("/discuss/room/office");
  await page.getByLabel("Message", { exact: true }).fill(`Live hello ${t}`);
  await submit(page, page.getByRole("button", { name: "Send" }));

  // The colleague's page was never reloaded: Redis pub/sub → event stream → refresh.
  await expect(other.getByText(`Live hello ${t}`)).toBeVisible({ timeout: 10_000 });
});
