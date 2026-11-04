import { expect, test } from "./fixtures";
import { fillMandatory, login, newQuotation, open, tag } from "./helpers";

test("the quotations list carries its figures, a value per quotation and status chips", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Figures Client ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await newQuotation(page, {
    client: client,
    pol: "BEANR",
    pod: "TRMER",
    sell: "900",
    service: "Ocean freight to Mersin",
  });
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  // Open, worth €900, no win rate yet.
  const row = () => page.getByRole("row").filter({ hasText: ref });
  const figures = page.locator('dl[aria-label="Figures"]');
  await open(page, `/quotations?q=${encodeURIComponent(client)}`);
  await expect(row()).toContainText("€900.00");
  await expect(figures).toContainText("Open 1");
  await expect(figures).toContainText("Win rate —");
  await page
    .getByRole("navigation", { name: "Status" })
    .getByRole("link", { name: "Accepted" })
    .click();
  await expect(page).toHaveURL(/status=accepted/);
  await expect(page.getByText("No quotations match.")).toBeVisible();

  // Accepted: booked, its value booked, a 100% win rate.
  await open(page, `/quotations?q=${encodeURIComponent(client)}`);
  await row().getByRole("link", { name: ref }).click();
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  await open(page, `/quotations?q=${encodeURIComponent(client)}&status=accepted`);
  await expect(row()).toBeVisible();
  await expect(figures).toContainText("Booked 1");
  await expect(figures).toContainText("Booked value €900.00");
  await expect(figures).toContainText("Win rate 100%");

  // The period and the one before (legacy statsPanel): made this month, so it is in, and up on last month.
  await page
    .getByRole("navigation", { name: "Period" })
    .getByRole("link", { name: "This month" })
    .click();
  await expect(page).toHaveURL(/period=month/);
  await expect(figures).toContainText("Booked 1");
  await page
    .getByRole("navigation", { name: "Period" })
    .getByRole("link", { name: "vs previous" })
    .click();
  await expect(page).toHaveURL(/cmp=prev/);
  await expect(figures).toContainText(/Booked 1\s*▲ 100%/);

  // The figures chosen are a link; the rankings name the customer.
  await page.getByText("Choose the figures").click();
  await page.getByLabel("Shown", { exact: true }).uncheck();
  await expect(page).toHaveURL(/figs=/);
  await expect(figures).not.toContainText("Shown");
  await expect(figures).toContainText("Win rate 100%");

  // The columns are the person's own and survive a reload; a header orders the list.
  await open(page, `/quotations?q=${encodeURIComponent(client)}`);
  const table = page.getByRole("table", { name: "Quotations" });
  await page.locator("summary", { hasText: "Columns" }).click();
  let saved = page.waitForResponse((r) => r.request().method() === "POST");
  await page.getByRole("group", { name: "Columns" }).getByLabel("Valid until").uncheck();
  await saved;
  await expect(table.getByRole("columnheader", { name: "Valid until" })).toHaveCount(0);
  await open(page, `/quotations?q=${encodeURIComponent(client)}`);
  await expect(table.getByRole("columnheader", { name: "Valid until" })).toHaveCount(0);
  await table.getByRole("button", { name: "Ref" }).click();
  await expect(page).toHaveURL(/sort=ref/);

  // A right click on the customer keeps the rows like it, then leaves them out.
  await row().getByRole("cell").nth(1).click({ button: "right" });
  await page.getByRole("menuitem", { name: `Show similar · Customer: ${client}` }).click();
  await expect(page).toHaveURL(/client=/);
  await expect(row()).toBeVisible();
  await row().getByRole("cell").nth(1).click({ button: "right" });
  await page.getByRole("menuitem", { name: `Filter out · Customer: ${client}` }).click();
  await expect(page).toHaveURL(/xclient=/);
  await expect(page.getByText("No quotations match.")).toBeVisible();
  await page.getByRole("link", { name: /Not customer: / }).click();
  await expect(row()).toBeVisible();

  await page.locator("summary", { hasText: "Columns" }).click();
  saved = page.waitForResponse((r) => r.request().method() === "POST");
  await page.getByRole("button", { name: "Reset" }).click();
  await saved;
  await expect(table.getByRole("columnheader", { name: "Valid until" })).toBeVisible();
});
