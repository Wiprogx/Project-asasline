import { expect, test } from "./fixtures";
import { login, open } from "./helpers";

test("the cash flow reads what went through the bank, month by month", async ({ page }) => {
  await login(page);
  await open(page, "/accounting/cash-flow");
  await expect(page.getByRole("heading", { level: 1, name: "Cash flow" })).toBeVisible();
  // Either money moved in the period (a table with the running cash) or nothing did; both read.
  const table = page.getByRole("table", { name: "Cash flow" });
  const empty = page.getByText("No money moved through the bank in this period.");
  await expect(table.or(empty)).toBeVisible();
  if (await table.isVisible()) {
    await expect(table).toContainText("Cash at the start");
    await expect(table).toContainText("Cash at the end");
  }
});
