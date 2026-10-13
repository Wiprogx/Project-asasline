import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

const day = (offset: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels" }).format(
    new Date(Date.now() + offset * 86_400_000),
  );

async function sailing(
  page: Parameters<typeof login>[0],
  ship: string,
  voyage: string,
  pol: string,
  pod: string,
  etd: number,
  eta: number,
) {
  await open(page, "/settings/vessels");
  await page.getByLabel("Vessel", { exact: true }).fill(ship);
  await page.getByLabel("Voyage", { exact: true }).fill(voyage);
  await page.getByLabel("From (UN/LOCODE)").fill(pol);
  await page.getByLabel("To (UN/LOCODE)").fill(pod);
  await page.getByLabel("ETD", { exact: true }).fill(day(etd));
  await page.getByLabel("ETA", { exact: true }).fill(day(eta));
  await submit(page, page.getByRole("button", { name: "Add sailing" }));
  await expectToast(page, /Saved|added|Sailing/i);
}

test("a transhipment leg carries the arrival: the last vessel decides the ETA, the first the cut-offs", async ({
  page,
}) => {
  const t = tag();
  const feeder = `E2E FEEDER ${t}`.toUpperCase();
  const mother = `E2E MOTHER ${t}`.toUpperCase();
  await login(page);
  await sailing(page, feeder, "F1", "BEANR", "ESVLC", 20, 25);
  await sailing(page, mother, "M1", "ESVLC", "TRMER", 27, 40);

  const client = `E2E Legs ${t}`;
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
  const bookingUrl = page.url();
  const edit = `${bookingUrl}/edit`;

  // The main sailing: dates and cut-offs; then the onward leg: the arrival moves to its ETA.
  await open(page, edit);
  await page
    .getByLabel("Sailing", { exact: true })
    .selectOption({ label: `${feeder} · F1 — BEANR › ESVLC · ETD ${day(20)}` });
  await submit(page, page.getByRole("button", { name: "Set sailing" }));
  await expectToast(page, "On the sailing — dates and closings set");
  await open(page, edit);
  await expect(page.getByLabel("ETA", { exact: true })).toHaveValue(day(25));
  await page
    .getByLabel("Connecting sailing")
    .selectOption({ label: `${mother} · M1 — ESVLC › TRMER · ETD ${day(27)}` });
  await submit(page, page.getByRole("button", { name: "Add transhipment leg" }));
  await expectToast(page, "Leg added — the arrival follows the last one");
  await open(page, edit);
  await expect(page.getByLabel("ETA", { exact: true })).toHaveValue(day(40));
  await expect(page.getByLabel("ETD", { exact: true })).toHaveValue(day(20));
  await expect(page.getByLabel("Port cut-off", { exact: true })).toHaveValue(day(19));

  // The booking reads the routing; the copies are not blocked by the later arrival.
  await open(page, bookingUrl);
  await expect(page.getByText(`${feeder} F1 → ${mother} M1`)).toBeVisible();
  await expect(page.getByText(/the register says/)).toHaveCount(0);

  // The leg taken off: the arrival falls back to the main sailing's.
  await open(page, edit);
  await submit(page, page.getByRole("button", { name: "Take off" }));
  await expectToast(page, "Leg taken off");
  await open(page, edit);
  await expect(page.getByLabel("ETA", { exact: true })).toHaveValue(day(25));
});
