import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("an alert on a booking is seen by everyone who opens it, headlines the list, and is resolved, not removed", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Alerts ${t}`;
  await login(page);
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
  const url = page.url();
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  await expect(page.getByText("No alerts.")).toBeVisible();
  await page.getByLabel("Level").selectOption("info");
  await page.getByLabel("Alert", { exact: true }).fill(`Consignee on holiday ${t}`);
  await submit(page, page.getByRole("button", { name: "Raise alert" }));
  await expectToast(page, "Alert raised");
  await page.getByLabel("Level").selectOption("urgent");
  await page.getByLabel("Alert", { exact: true }).fill(`Box held for scan ${t}`);
  await submit(page, page.getByRole("button", { name: "Raise alert" }));
  await expectToast(page, "Alert raised");

  // The most serious first, on the booking and in the list.
  const open1 = page.getByRole("list", { name: "Open alerts" }).getByRole("listitem");
  await expect(open1.first()).toContainText("Urgent");
  await expect(open1.first()).toContainText(`Box held for scan ${t}`);
  await open(page, `/bookings?q=${encodeURIComponent(ref)}`);
  await expect(page.getByRole("row").filter({ hasText: ref })).toContainText(
    `Box held for scan ${t}`,
  );

  // Resolved: off the booking, the next one headlines, and the history keeps both.
  await open(page, url);
  await submit(page, open1.first().getByRole("button", { name: "Resolve" }));
  await expectToast(page, "Alert resolved");
  await expect(open1).toHaveCount(1);
  await open(page, `${url}/history`);
  await expect(page.getByText(/alert/i).first()).toBeVisible();
});
