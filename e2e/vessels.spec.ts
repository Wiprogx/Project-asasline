import { expect, test } from "./fixtures";
import { choose, expectToast, fillMandatory, login, open, submit, tag } from "./helpers";

const day = (offset: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(
    new Date(Date.now() + offset * 86_400_000),
  );

test("a booking on a sailing takes its dates and closings, and moves when the sailing moves", async ({
  page,
}) => {
  const t = tag();
  const ship = `E2E STAR ${t}`.toUpperCase();
  await login(page);

  await open(page, "/settings/vessels");
  await page.getByLabel("Vessel", { exact: true }).fill(ship);
  await page.getByLabel("Voyage", { exact: true }).fill("V100");
  await page.getByLabel("From (UN/LOCODE)").fill("BEANR");
  await page.getByLabel("To (UN/LOCODE)").fill("TRMER");
  await page.getByLabel("ETD", { exact: true }).fill(day(20));
  await page.getByLabel("ETA", { exact: true }).fill(day(35));
  await submit(page, page.getByRole("button", { name: "Add sailing" }));
  await expectToast(page, `${ship} · V100 added`);

  const client = `E2E Sailing Client ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/quotations/new");
  await choose(page.getByLabel("Customer"), { label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Sell (EUR)").fill("900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const sb = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  const edit = `${page.url()}/edit`;

  await open(page, edit);
  await choose(page.getByLabel("Sailing", { exact: true }), {
    label: `${ship} · V100 — BEANR › TRMER · ETD ${day(20)}`,
  });
  await submit(page, page.getByRole("button", { name: "Set sailing" }));
  await expectToast(page, "On the sailing — dates and closings set");
  await open(page, edit);
  await expect(page.getByLabel("ETD", { exact: true })).toHaveValue(day(20));
  await expect(page.getByLabel("Port cut-off", { exact: true })).toHaveValue(day(19));
  await expect(page.getByLabel("Customs closing", { exact: true })).toHaveValue(day(17));

  // Tracked from the booking: the ship, its schedule, the bookings on it.
  await open(page, edit.replace(/\/edit$/, ""));
  await page.getByRole("link", { name: `${ship} · V100` }).click();
  await expect(page.getByRole("heading", { level: 1, name: `${ship} · V100` })).toBeVisible();
  await expect(page.getByText("Bookings on this sailing (1)")).toBeVisible();
  await expect(page.getByRole("link", { name: sb })).toBeVisible();
  await expect(page.getByText(day(20)).first()).toBeVisible();

  // The carrier moves the ship five days: the booking moves with it.
  await open(page, "/settings/vessels");
  await page.getByRole("link", { name: `${ship} · V100` }).click();
  await expect(page.getByRole("link", { name: sb })).toBeVisible();
  await page.getByLabel("ETD", { exact: true }).fill(day(25));
  await page.getByLabel("ETA", { exact: true }).fill(day(40));
  await submit(page, page.getByRole("button", { name: "Save sailing" }));
  await expectToast(page, "Saved — 1 booking moved with it");
  await open(page, edit);
  await expect(page.getByLabel("ETD", { exact: true })).toHaveValue(day(25));
  await expect(page.getByLabel("Port cut-off", { exact: true })).toHaveValue(day(24));
});
