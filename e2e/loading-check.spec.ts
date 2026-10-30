import { expect, test } from "./fixtures";
import {
  choose,
  expectChosen,
  expectToast,
  fillMandatory,
  login,
  newQuotation,
  open,
  submit,
  tag,
} from "./helpers";

test("a loading that ran over the agreed hours is measured from the CMR and charged on the quotation", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Loading ${t}`;
  const waiting = `Waiting time per hour ${t}`;
  await login(page);

  // Waiting time in the catalogue (Other services).
  await open(page, "/settings/catalogue");
  await choose(page.getByLabel("Category"), { label: "Other services" });
  await page.getByRole("textbox", { name: "Name" }).fill(waiting);
  await page.getByLabel("Sell (EUR)").fill("55");
  await page.getByLabel("Buy (EUR)").fill("40");
  await submit(page, page.getByRole("button", { name: "Add item" }));
  await expectToast(page, "Added to the catalogue");

  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await newQuotation(page, { client: client, pol: "BEANR", pod: "TRMER", sell: "900" });
  await page.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const url = page.url();

  // The box: loaded from 08:00 under a 2-hour mode, the CMR says it finished at 11:20.
  await open(page, `${url}/containers`);
  await choose(page.getByLabel("Loading mode").first(), { label: "Direct loading — 2 hours" });
  await page.getByLabel("Loading date").first().fill("2026-10-14");
  await page.getByLabel("Time", { exact: true }).first().fill("08:00");
  await expect(page.getByLabel("Loading finished — date").first()).toBeVisible();
  await page.getByLabel("Loading finished — date").first().fill("2026-10-14");
  await page.getByLabel("Loading finished — time").first().fill("11:20");
  await submit(page, page.getByRole("button", { name: "Save", exact: true }).first());
  await expectToast(page, /saved/i);
  await expect(page.getByText(/Took 3\.3h against 2h agreed — 1\.3h over\./)).toBeVisible();

  // The charge offered: waiting time, two hours, the reason written.
  const card = page
    .locator("[data-slot=card]")
    .filter({ hasText: "Charge the extra time — box 1" });
  await expectChosen(card.getByLabel("Charge", { exact: true }), /.+/);
  await expect(card.getByLabel("Quantity, days or hours")).toHaveValue("2");
  await submit(page, card.getByRole("button", { name: "Add to the quotation" }));
  await expectToast(page, /Added to the quotation: .*waiting.* ×2/i);
});
