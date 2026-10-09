import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a hold opens a task and shows on the booking; the journey is ticked step by step; the originals carry their courier link", async ({
  page,
}) => {
  const t = tag();
  await login(page);

  await open(page, "/settings/release");
  await expect(page.getByText(/6 entries/)).toBeVisible();
  await expect(page.getByText(/8 entries/)).toBeVisible();

  const client = `E2E Release ${t}`;
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
  const ref = await page.getByRole("heading", { level: 1 }).innerText();
  const id = page.url().split("/bookings/")[1];

  // A hold: who asked, what must happen; a task for tomorrow; the badge in the header.
  await open(page, `/bookings/${id}/tracking`);
  await page.getByLabel("Where it stands today").selectOption("hold_pay");
  await page.getByLabel("Who asked for the hold").selectOption({ label: client });
  await page.getByLabel("What must happen to lift it").fill("Freight paid");
  await submit(page, page.getByRole("button", { name: "Set release status" }));
  await expectToast(page, "Hold recorded");
  await expect(page.getByText("Held — payment outstanding").first()).toBeVisible();
  await open(page, "/activity"); // the task is mine, due tomorrow: in my open list
  await expect(
    page.getByText(`Clear the hold on ${ref} — Held — payment outstanding`),
  ).toBeVisible();

  // Lifting it closes that task.
  await open(page, `/bookings/${id}/tracking`);
  await page.getByLabel("Where it stands today").selectOption("released");
  await submit(page, page.getByRole("button", { name: "Set release status" }));
  await expectToast(page, "Release status updated");
  await open(page, "/activity");
  await expect(page.getByText(`Clear the hold on ${ref} — Held — payment outstanding`)).toHaveCount(
    0,
  );

  // The journey: the first step confirmed carries today's date and becomes the stage.
  await open(page, `/bookings/${id}/tracking`);
  const first = page.getByRole("listitem").filter({ hasText: "Booking confirmed" });
  await submit(page, first.getByRole("button", { name: "Confirm" }));
  await expectToast(page, "Journey updated");
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: "Booking confirmed" })
      .getByText(/\d{4}-\d{2}-\d{2}/),
  ).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Trucker confirmed" })).toHaveAttribute(
    "aria-current",
    "step",
  );

  // The originals: a courier that tracks gives a link to its own page.
  await page.getByLabel("Sent by").selectOption("DHL");
  await page.getByLabel("Waybill / tracking number").fill("1234567890");
  await page.getByLabel("Sent on").fill("2026-10-09");
  await submit(page, page.getByRole("button", { name: "Note the originals" }));
  await expectToast(page, "Originals noted");
  await expect(page.getByRole("link", { name: /Track 1234567890/ })).toHaveAttribute(
    "href",
    /dhl\.com.*1234567890/,
  );
});
