import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a message received on a booking is answered in place: same channel, the sender, Re: on the subject", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Reply Client ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByLabel("Email").fill(`reply.${t}@example.com`);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByRole("button", { name: "Create booking" }).click();
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(/^SB/);
  const ref = (await heading.textContent())!.trim();
  const url = page.url();

  // The customer's mail, logged on the booking.
  await open(page, "/discuss/queue");
  await page.getByRole("button", { name: "Log a message received" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("From (name, e-mail or phone)").fill(`reply.${t}@example.com`);
  await d.getByLabel("Contact").selectOption({ label: client });
  await d.getByLabel("Booking or quotation no.").fill(ref);
  await d.getByLabel("Subject").fill(`Loading date ${t}`);
  await d.getByLabel("Message").fill("Can you load on Tuesday?");
  await submit(page, d.getByRole("button", { name: "Log it" }));
  await expectToast(page, "Logged");

  await open(page, `${url}/messages`);
  const received = page.getByRole("listitem").filter({ hasText: "Can you load on Tuesday?" });
  await received.getByRole("link", { name: "Reply" }).click();
  await expect(page.getByLabel("E-mail address")).toHaveValue(`reply.${t}@example.com`);
  await expect(page.getByLabel("Subject")).toHaveValue(`Re: Loading date ${t}`);
  await page.getByLabel("Message", { exact: true }).fill("Tuesday 8:00 works.");
  await submit(page, page.getByRole("button", { name: "Record and open to send" }));
  await expectToast(page, /Recorded|Sent/);

  const answer = page.getByRole("listitem").filter({ hasText: "Tuesday 8:00 works." });
  await expect(answer).toContainText("↳ a reply");
  await expect(answer).toContainText(`Re: Loading date ${t}`);
});
