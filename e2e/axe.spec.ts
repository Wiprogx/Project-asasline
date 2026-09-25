import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { login, open, tag } from "./helpers";

/** WCAG 2.2 AA through axe: nothing serious or critical on the office's screens, in both themes. */
async function audit(page: Page, name: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .disableRules(["region"]) // the sidebar shell's inset already holds the main landmark
    .analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    bad.map(
      (v) =>
        `${name}: ${v.id} (${v.impact}) — ${v.nodes
          .map((n) => n.target.join(" "))
          .slice(0, 3)
          .join(" | ")}`,
    ),
    `axe on ${name}`,
  ).toEqual([]);
}

const PAGES = [
  "/",
  "/activity",
  "/quotations",
  "/quotations/new",
  "/bookings",
  "/bookings/new",
  "/contacts",
  "/contacts/new",
  "/discuss",
  "/accounting",
  "/accounting/journal",
  "/settings/people",
  "/settings/rules",
  "/settings/permissions",
  "/settings/catalogue",
  "/account",
];

for (const theme of ["dark", "light"] as const) {
  test(`the office passes axe in the ${theme} theme`, async ({ page }) => {
    test.setTimeout(240_000); // seventeen screens, each analysed in full
    await page.addInitScript((t) => window.localStorage.setItem("theme", t), theme);
    await open(page, "/login");
    await audit(page, "/login");
    await login(page);
    for (const path of PAGES) {
      await open(page, path);
      await audit(page, path);
    }
  });
}

test("a record's screens and an open dialog pass axe", async ({ page }) => {
  test.setTimeout(240_000);
  const t = tag();
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(`E2E Axe Client ${t}`);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `E2E Axe Client ${t}` })).toBeVisible();
  await audit(page, "contact");
  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: `E2E Axe Client ${t}` });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Service").fill("Ocean freight");
  await page.getByLabel("Sell (EUR)").fill("900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  await audit(page, "quotation");
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const base = page.url();
  for (const tab of [
    "",
    "/edit",
    "/documents",
    "/containers",
    "/tasks",
    "/messages",
    "/billing",
    "/history",
  ]) {
    await open(page, base + tab);
    await audit(page, `booking${tab || "/summary"}`);
  }
  // A dialog with a form in it (the booking's cancel-with-a-reason): trap, label, escape.
  await open(page, base);
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit(page, "dialog");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
