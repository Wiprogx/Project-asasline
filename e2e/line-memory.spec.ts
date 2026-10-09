import { expect, test } from "./fixtures";
import { login, open, submit, tag, uniqueVat } from "./helpers";

const ublBill = (
  vat: string,
  name: string,
  ref: string,
  text: string,
) => `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${ref}</cbc:ID><cbc:IssueDate>2026-09-10</cbc:IssueDate><cbc:DueDate>2026-10-10</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode><cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party><cac:PostalAddress><cac:Country><cbc:IdentificationCode>BE</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyTaxScheme><cbc:CompanyID>${vat}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
    <cac:PartyLegalEntity><cbc:RegistrationName>${name}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>
  <cac:LegalMonetaryTotal><cbc:PayableAmount currencyID="EUR">121.00</cbc:PayableAmount></cac:LegalMonetaryTotal>
  <cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="EUR">100.00</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>${text}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>21</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="EUR">100.00</cbc:PriceAmount></cac:Price></cac:InvoiceLine>
</Invoice>`;

test("a supplier's line is booked where it went last time", async ({ page }) => {
  const t = tag();
  const vat = uniqueVat("BE");
  const supplier = `E2E Landlord ${t}`;
  await login(page);

  // First bill by hand: the rent goes on 610000.
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(supplier);
  await page.getByLabel("VAT number").fill(vat);
  await page.getByLabel("Country (ISO-2)").fill("BE");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: supplier })).toBeVisible();
  await open(page, "/accounting/bills");
  await page.getByLabel("Supplier", { exact: true }).selectOption({ label: supplier });
  await page.getByRole("button", { name: "New bill" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Bill from ${supplier}`);
  await page.getByLabel("Line", { exact: true }).fill(`Warehouse rent, September ${t}`);
  await page.getByLabel("Unit (EUR)").fill("100");
  await page.getByLabel("Account").selectOption("610000");
  await submit(page, page.getByRole("button", { name: "Add line" }));
  await expect(page.getByRole("cell", { name: /Warehouse rent, September/ })).toContainText(
    "610000",
  );
  await page.getByLabel("Supplier's number").fill(`R-${t}-1`);
  await submit(page, page.getByRole("button", { name: "Record bill" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^BILL\//);

  // The next month's bill comes in by Peppol: the same words, the same account, without a word.
  await open(page, "/accounting/bills");
  await page.getByLabel("Peppol invoice (UBL XML)").setInputFiles({
    name: `ubl-${t}.xml`,
    mimeType: "application/xml",
    buffer: Buffer.from(ublBill(vat, supplier, `R-${t}-2`, `Warehouse rent, October ${t}`)),
  });
  await page.getByRole("button", { name: "Import Peppol file" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Bill from ${supplier}`);
  await expect(page.getByRole("cell", { name: /Warehouse rent, October/ })).toContainText("610000");
});
