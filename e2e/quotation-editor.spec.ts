import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  choose,
  expectToast,
  fillMandatory,
  login,
  newItem,
  newQuotation,
  open,
  pick,
  portTag,
  submit,
  tag,
} from "./helpers";

const card = (page: Page, title: RegExp) =>
  page.locator("[data-slot=card]").filter({ has: page.getByText(title) });

test("a quotation with two destinations, priced from the agreement and the catalogue", async ({
  page,
}) => {
  // The whole office in one journey: carrier, catalogue, agreement, quotation.
  test.slow();
  const t = tag();
  // A country no real one uses (ISO keeps XA–XZ and QM–QZ for private use), added to Settings ›
  // Countries; other runs may have left documents for it, so totals are compared, not fixed.
  const codes = [..."ABCDEFGHIJLMNOPQRSTUVWXYZ"]
    .map((c) => `X${c}`)
    .concat([..."MNOPQRSTUVWXYZ"].map((c) => `Q${c}`));
  const country = codes[Math.floor(Math.random() * codes.length)];
  // A port of that country: an ocean leg's country is its port of discharge's.
  const pod = `${country}${portTag().slice(2)}`;
  const doc = `E2EDOC${t.slice(-4).toUpperCase()}`;
  await login(page);
  await open(page, "/settings/countries");
  await page.getByRole("button", { name: "Add a country" }).click();
  await page.getByRole("dialog").getByLabel("ISO code").fill(country);
  await page.getByRole("dialog").getByLabel("Name", { exact: true }).fill(`Testland ${country}`);
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Add" }));
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: /Added|already in the table/ })
      .first(),
  ).toBeVisible();

  // The catalogue: an ocean leg and the document its country requires.
  await newItem(page);
  await pick(page, page.getByRole("combobox", { name: "Port of loading" }), "BEANR");
  await pick(page, page.getByRole("combobox", { name: "Port of discharge" }), pod);
  await page.getByLabel("Sell price (€)").fill("3000");
  await page.getByLabel("Buy price / cost (€)").fill("2000");
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, "Added to the catalogue");
  await page.getByRole("button", { name: "New item" }).click();
  await choose(page.getByLabel("Category"), { label: "Country document" });
  await page.getByLabel(/^Document code/).fill(doc);
  await pick(page, page.getByRole("combobox", { name: "Required for country" }), country);
  await page.getByLabel("Sell price (€)").fill("200");
  await page.getByLabel("Buy price / cost (€)").fill("120");
  await submit(page, page.getByRole("button", { name: "Save" }));
  await expectToast(page, "Added to the catalogue");

  // A customer with an agreed price for the leg.
  const client = `E2E Editor Client ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/settings/price-lists");
  await choose(page.getByLabel("Customer"), { label: client });
  await page.getByLabel("Agreement").fill("Editor deal");
  await page.getByRole("button", { name: "Add agreement" }).click();
  await expect(page.getByRole("heading", { name: "Editor deal" })).toBeVisible();
  await choose(page.getByLabel("Catalogue item"), { label: `BEANR › ${pod} · 40HC · ocean` });
  await page.getByLabel("Agreed sell (EUR)").fill("2800");
  await submit(page, page.getByRole("button", { name: "Set price" }));
  await expectToast(page, "Agreed price saved");

  // A quotation with a first destination typed in.
  await newQuotation(page, {
    client: client,
    pol: "BEANR",
    pod: "TRMER",
    sell: "900",
    service: "Ocean freight to Mersin",
  });

  // A second destination from the leg: its lines come priced, agreement first.
  await choose(page.getByLabel("Ocean leg"), { label: `BEANR › ${pod} · 40HC` });
  await submit(page, page.getByRole("button", { name: "Add destination" }));
  await expectToast(page, "Destination added");
  const leg = card(page, new RegExp(`BEANR → ${pod}`));
  const legLine = leg.getByRole("row").filter({ hasText: `BEANR › ${pod}` });
  await expect(legLine).toContainText("Agreed");
  await expect(legLine).toContainText("€2,800.00");
  const docLine = leg.getByRole("row").filter({ hasText: `${doc} — ${country}` });
  await expect(docLine).toContainText("Catalogue");
  await expect(docLine).toContainText("€200.00");

  // A price changed by hand is marked as typed.
  await docLine.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("dialog").getByLabel("Sell (EUR)").fill("250");
  await page
    .getByRole("dialog")
    .getByLabel("Save a changed price to the customer's price agreement")
    .uncheck();
  await submit(page, page.getByRole("button", { name: "Save line" }));
  await expectToast(page, "Line saved");
  await expect(docLine).toContainText("Typed");
  await expect(docLine).toContainText("€250.00");

  // A typed line, then taken off with a reason: the total is as it was.
  const footer = leg.locator("tfoot");
  const before = await footer.textContent();
  await leg.getByLabel("Or a service typed").fill("Extra stop in Mechelen");
  await leg.getByLabel("Sell (EUR)").fill("150");
  await submit(page, leg.getByRole("button", { name: "Add line" }));
  await expectToast(page, "Line added");
  const extra = leg.getByRole("row").filter({ hasText: "Extra stop in Mechelen" });
  await extra.getByRole("button", { name: "Remove" }).click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("Customer loads in Antwerp");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Remove" }));
  await expectToast(page, "Line removed");
  await expect(extra).toHaveCount(0);
  await expect(footer).toHaveText(before!);

  // The customer declines Mersin, and takes the other destination.
  const mersin = card(page, /BEANR → TRMER/);
  await mersin.getByRole("button", { name: "Declined" }).click();
  await page
    .getByPlaceholder("Why? It stays on the record.")
    .fill("Price higher than a competitor");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Mark declined" }));
  await expectToast(page, "Marked as declined");
  await expect(mersin).toContainText("Declined — Price higher than a competitor");
  await leg.getByRole("button", { name: "Accept → create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);

  // The booking bills its own destination only.
  await open(page, `${page.url()}/billing`);
  await expect(page.getByText(`BEANR › ${pod}`)).toBeVisible();
  await expect(page.getByText(`${doc} — ${country}`)).toBeVisible();
  await expect(page.getByText("Ocean freight to Mersin")).toHaveCount(0);
});
