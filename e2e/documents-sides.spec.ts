import { expect, test } from "./fixtures";
import { choose, fillMandatory, login, open, tag } from "./helpers";

test("a shipment both ways shows its export papers and its import papers apart", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Sides ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await fillMandatory(page);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await open(page, "/bookings/new");
  await choose(page.getByLabel("Customer"), { label: client });
  await choose(page.getByLabel("Direction"), "both");
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Number of containers").fill("1");
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const docs = `${page.url()}/documents`;

  // The import's B/L or telex release is on the import side only.
  await open(page, docs);
  const sides = page.getByRole("navigation", { name: "Side of the shipment" });
  await expect(sides.getByRole("link", { name: /Export papers/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("heading", { name: /^Export papers/ })).toBeVisible();
  // (The upload form still offers every step: a file may be filed against either side.)
  const papers = page.locator("[data-slot=card]").filter({
    has: page.getByRole("heading", { name: /papers|Document steps/ }),
  });
  await expect(papers.getByText("Bill of lading or telex release")).toHaveCount(0);
  await sides.getByRole("link", { name: /Import papers/ }).click();
  await expect(page).toHaveURL(/side=import/);
  await expect(page.getByRole("heading", { name: /^Import papers/ })).toBeVisible();
  await expect(papers.getByText("Bill of lading or telex release").first()).toBeVisible();
});
