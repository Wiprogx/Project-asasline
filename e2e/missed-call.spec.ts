import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a missed call about a booking becomes a call-back task for today, linked to it", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Missed Call ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByRole("button", { name: "Create booking" }).click();
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(/^SB/);
  const sb = (await heading.innerText()).trim();

  const caller = `+32 470 ${t.slice(-6)}`;
  await open(page, "/discuss/queue");
  await page.getByRole("button", { name: "Log a message received" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("By").selectOption("call");
  await d.getByLabel("From (name, e-mail or phone)").fill(caller);
  await d.getByLabel("Booking or quotation no.").fill(sb);
  await d.getByLabel("Call outcome").selectOption("missed");
  await d.getByLabel("Call minutes").fill("0");
  await submit(page, d.getByRole("button", { name: "Log it" }));
  await expectToast(page, "Logged");

  await open(page, `/activity?who=all&q=${encodeURIComponent(caller)}`);
  const task = page.getByRole("listitem").filter({ hasText: `Call back ${caller} about ${sb}` });
  await expect(task).toBeVisible();
  await expect(task.getByRole("link", { name: sb })).toBeVisible();
});
