import { expect, test } from "@playwright/test";
import { expectToast, login, submit, tag } from "./helpers";

const brusselsDay = (offset: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(
    new Date(Date.now() + offset * 86_400_000),
  );

test("a sailed shipment's cost not yet invoiced is booked to receive, then cancelled", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Accrual Client ${t}`;
  const yesterday = brusselsDay(-1);
  await login(page);
  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await page.goto("/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Sell (EUR)").fill("1500");
  await page.getByLabel("Cost (EUR)").fill("900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const sb = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  // It sailed yesterday.
  await page.goto(`${page.url()}/edit`);
  await page.getByLabel("ETD").fill(yesterday);
  await submit(page, page.getByRole("button", { name: "Save booking" }));
  await expectToast(page, /saved/i);

  await page.goto(`/accounting/accruals?on=${yesterday}`);
  const row = page.getByRole("row").filter({ hasText: sb });
  await expect(row).toContainText("€900.00");
  await expect(row.getByRole("cell").last()).toHaveText("€900.00");

  await submit(page, page.getByRole("button", { name: new RegExp(`^Book .* on ${yesterday}$`) }));
  await expectToast(page, `Costs to receive booked on ${yesterday}, reversed the next day`);

  await page.goto(`/accounting/ledger/444000?from=${yesterday}&to=${yesterday}`);
  await expect(page.getByRole("link", { name: `ACR-${yesterday}` })).toBeVisible();

  // Undone with a reason: both entries leave the books.
  await page.goto(`/accounting/accruals?on=${yesterday}`);
  const run = page
    .getByRole("listitem")
    .filter({ hasText: `ACR-${yesterday}` })
    .filter({ has: page.getByRole("button", { name: "Cancel" }) });
  await run.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Booked by mistake in a test");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Cancel run" }));
  await expectToast(page, "Costs to receive cancelled");
});
