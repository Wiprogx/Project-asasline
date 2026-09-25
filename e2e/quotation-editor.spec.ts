import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

const card = (page: Page, title: RegExp) =>
  page.locator("[data-slot=card]").filter({ has: page.getByText(title) });

test("a quotation with two destinations, priced from the agreement and the catalogue", async ({
  page,
}) => {
  const t = tag();
  const pod = `Q${t.slice(-4).toUpperCase()}`;
  // Other runs may have left documents for the same code, so totals are compared, not fixed.
  const letter = (n: number) => String.fromCharCode(65 + (n % 26));
  const country = letter(Date.now()) + letter(Math.floor(Math.random() * 26));
  const doc = `E2EDOC${t.slice(-4).toUpperCase()}`;
  await login(page);

  // The catalogue: an ocean leg and the document its country requires.
  await open(page, "/settings/catalogue");
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill(pod);
  await page.getByLabel("Country").fill(country);
  await page.getByLabel("Sell (EUR)").fill("3000");
  await page.getByLabel("Buy (EUR)").fill("2000");
  await submit(page, page.getByRole("button", { name: "Add item" }));
  await expectToast(page, "Added to the catalogue");
  await page.getByLabel("Category").selectOption({ label: "Country document" });
  await page.getByLabel("Document code").fill(doc);
  await page.getByLabel("Country").fill(country);
  await page.getByLabel("Sell (EUR)").fill("200");
  await page.getByLabel("Buy (EUR)").fill("120");
  await submit(page, page.getByRole("button", { name: "Add item" }));
  await expectToast(page, "Added to the catalogue");

  // A customer with an agreed price for the leg.
  const client = `E2E Editor Client ${t}`;
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();
  await open(page, "/settings/price-lists");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Agreement").fill("Editor deal");
  await page.getByRole("button", { name: "Add agreement" }).click();
  await expect(page.getByRole("heading", { name: "Editor deal" })).toBeVisible();
  await page.getByLabel("Catalogue item").selectOption({ label: `BEANR › ${pod} · ocean` });
  await page.getByLabel("Agreed sell (EUR)").fill("2800");
  await submit(page, page.getByRole("button", { name: "Set price" }));
  await expectToast(page, "Agreed price saved");

  // A quotation with a first destination typed in.
  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Service").fill("Ocean freight to Mersin");
  await page.getByLabel("Sell (EUR)").fill("900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);

  // A second destination from the leg: its lines come priced, agreement first.
  await page.getByLabel("Ocean leg").selectOption({ label: `BEANR › ${pod}` });
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
