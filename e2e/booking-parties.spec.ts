import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

async function contact(page: Page, name: string, extra: Record<string, string> = {}) {
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(name);
  for (const [label, value] of Object.entries(extra)) await page.getByLabel(label).fill(value);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test("the office's counterparts are on the file: doc check gets the news, the line, the depot and the courier pick-up", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Parties Client ${t}`;
  const checker = `E2E Checker ${t}`;
  const line = `E2E Line ${t}`;
  await login(page);
  await contact(page, client, { Email: `client.${t}@example.com` });
  await contact(page, checker, { Email: `check.${t}@example.com`, Tags: "Doc Check" });
  await contact(page, line, { Professions: "Carrier" });

  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const url = page.url();

  // Each picker lists the contacts that fit the role first (legacy roleOptions).
  await open(page, `${url}/edit`);
  const lineOptions = page.getByLabel("Shipping line").locator("option");
  await expect(lineOptions.nth(1)).toHaveText(line);
  await expect(page.getByLabel("Doc check").locator("option").nth(1)).toHaveText(checker);
  await page.getByLabel("Doc check").selectOption({ label: checker });
  await page.getByLabel("Shipping line").selectOption({ label: line });
  await page.getByLabel("Pick-up depot").fill(`Depot ${t}`);
  await page.getByLabel("Terminal").fill(`Terminal ${t}`);
  await submit(page, page.getByRole("button", { name: "Save booking" }));
  await expectToast(page, "Saved");

  await open(page, url);
  await expect(page.getByText("Doc check", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: checker })).toBeVisible();
  await expect(page.getByRole("link", { name: line })).toBeVisible();
  await expect(page.getByText(`Depot ${t}`)).toBeVisible();
  await expect(page.getByText(`Terminal ${t}`)).toBeVisible();

  // Doc check can be written to from the booking.
  await open(page, `${url}/messages`);
  await expect(
    page
      .getByLabel("To a party on the file")
      .locator("option", { hasText: `${checker} (Doc check)` }),
  ).toHaveCount(1);

  // The vessel sails: the news goes to doc check, not to the customer (legacy b.docCheck || b.client).
  await open(page, `${url}/tracking`);
  await submit(
    page,
    page
      .getByRole("listitem")
      .filter({ hasText: "Vessel departure" })
      .getByRole("button", { name: "Confirm" }),
  );
  await expectToast(page, /Journey updated/);
  await open(page, `${url}/messages`);
  await expect(page.getByRole("listitem").filter({ hasText: "Sent automatically" })).toContainText(
    `→ ${checker}`,
  );

  // The originals: where the courier collects them, and the day the pick-up was booked.
  await open(page, `${url}/tracking`);
  await page.getByLabel("Courier collects at").fill(`Office ${t}`);
  await page.getByLabel("Pick-up booked on").fill("2026-10-14");
  await submit(page, page.getByRole("button", { name: "Note the originals" }));
  await expectToast(page, "Originals noted");
  await expect(page.getByText(`Pick-up booked 2026-10-14 at Office ${t}.`)).toBeVisible();
});
