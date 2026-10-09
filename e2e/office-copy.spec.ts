import { expect, test } from "./fixtures";
import { login, open } from "./helpers";

test("a full copy of the office downloads as JSON, without anyone's password", async ({ page }) => {
  await login(page);
  await open(page, "/settings/audit");
  const href = await page
    .getByRole("link", { name: "Download the copy (JSON)" })
    .getAttribute("href");
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/json");
  const body = (await res.json()) as { exportedAt: string; tables: Record<string, unknown[]> };
  expect(body.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(Array.isArray(body.tables.contacts)).toBe(true);
  expect(Array.isArray(body.tables.users)).toBe(true);
  expect(JSON.stringify(body)).not.toContain("passwordHash");
  expect(JSON.stringify(body)).not.toContain("$2");
});
