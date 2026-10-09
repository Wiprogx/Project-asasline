import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("the office says which acts of looking are recorded, and reads what a person did", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Watched Client ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const base = page.url();
  const short = base.split("/bookings/")[1].slice(0, 8);

  // Switched off: opening the cost tab leaves no line for this booking.
  await open(page, "/settings/audit");
  const cost = page.getByLabel("Cost and margin on a booking");
  await expect(cost).toBeChecked();
  await cost.uncheck();
  await submit(page, page.getByRole("button", { name: "Save what is recorded" }));
  await expectToast(page, "Saved — what is recorded");
  await open(page, `${base}/cost`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  await open(page, "/settings/audit?q=booking.cost.view");
  await expect(page.getByRole("row").filter({ hasText: `booking ${short}` })).toHaveCount(0);

  // Switched back on: the trace is there.
  await open(page, "/settings/audit");
  await page.getByLabel("Cost and margin on a booking").check();
  await submit(page, page.getByRole("button", { name: "Save what is recorded" }));
  await expectToast(page, "Saved — what is recorded");
  await open(page, `${base}/cost`);
  await open(page, "/settings/audit?q=booking.cost.view");
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: `booking ${short}` })
      .first(),
  ).toBeVisible();

  // What a person did: this week's figures and lines.
  await open(page, "/settings/people");
  await page.getByRole("link", { name: "What they did ›" }).first().click();
  await expect(page.getByRole("heading", { level: 2, name: /^What .* did$/ })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Range" }).getByRole("link", { name: "Week" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator('dl[aria-label="Figures"]')).toContainText("Entries");
  await expect(page.getByText("booking.cost.view").first()).toBeVisible();
  await page.getByRole("navigation", { name: "Range" }).getByRole("link", { name: "Day" }).click();
  await expect(page).toHaveURL(/range=day/);
});
