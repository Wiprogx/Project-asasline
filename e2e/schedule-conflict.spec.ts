import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

const day = (offset: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(
    new Date(Date.now() + offset * 86_400_000),
  );

test("a date typed over the sailing's stops the copies until the sailing's dates are taken back; a moved sailing tells the customer", async ({
  page,
}) => {
  const t = tag();
  const ship = `E2E CLASH ${t}`.toUpperCase();
  await login(page);

  await open(page, "/settings/vessels");
  await page.getByLabel("Vessel", { exact: true }).fill(ship);
  await page.getByLabel("Voyage", { exact: true }).fill("V200");
  await page.getByLabel("From (UN/LOCODE)").fill("BEANR");
  await page.getByLabel("To (UN/LOCODE)").fill("TRMER");
  await page.getByLabel("ETD", { exact: true }).fill(day(20));
  await page.getByLabel("ETA", { exact: true }).fill(day(35));
  await submit(page, page.getByRole("button", { name: "Add sailing" }));
  await expectToast(page, `${ship} · V200 added`);

  const client = `E2E Clash Client ${t}`;
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
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  const base = page.url();

  await open(page, `${base}/edit`);
  await page
    .getByLabel("Sailing", { exact: true })
    .selectOption({ label: `${ship} · V200 — BEANR › TRMER · ETD ${day(20)}` });
  await submit(page, page.getByRole("button", { name: "Set sailing" }));
  await expectToast(page, "On the sailing — dates and closings set");
  await open(page, base);
  await expect(page.getByRole("link", { name: "Customer copy (with price)" })).toBeVisible();

  // A date typed over the sailing's: the page says so, the copies will not come out.
  await open(page, `${base}/edit`);
  await page.getByLabel("ETD", { exact: true }).fill(day(22));
  await submit(page, page.getByRole("button", { name: "Save booking" }));
  await expectToast(page, "Saved");
  await open(page, base);
  await expect(page.getByText("Dates not the sailing's")).toBeVisible();
  await expect(
    page.getByText(`the page says the ship leaves ${day(22)}, the register says ${day(20)}`),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Customer copy (with price)" })).toHaveCount(0);
  await open(page, base.replace("/bookings/", "/print/bookings/") + "/customer");
  await expect(
    page.getByRole("alert").filter({ hasText: "The dates on this page are not the sailing's" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Booking confirmation" })).toHaveCount(0);

  // One click takes the sailing's dates back.
  await open(page, base);
  await submit(page, page.getByRole("button", { name: "Take the sailing's dates" }));
  await expectToast(page, "On the sailing — dates and closings set");
  await expect(page.getByRole("link", { name: "Customer copy (with price)" })).toBeVisible();
  await expect(page.getByText("Dates not the sailing's")).toHaveCount(0);

  // The carrier moves the ship: the booking follows, and the customer is to be told.
  await open(page, "/settings/vessels");
  await page.getByRole("link", { name: `${ship} · V200` }).click();
  await expect(page.getByRole("link", { name: ref })).toBeVisible();
  await page.getByLabel("ETD", { exact: true }).fill(day(25));
  await page.getByLabel("ETA", { exact: true }).fill(day(40));
  await submit(page, page.getByRole("button", { name: "Save sailing" }));
  await expectToast(page, "Saved — 1 booking moved with it");
  await open(page, `${base}/tasks`);
  await expect(
    page.getByRole("listitem").filter({ hasText: `Tell ${client} the new cut-offs for ${ref}` }),
  ).toBeVisible();
});
