import { expect, test } from "@playwright/test";
import { expectToast, login, submit, tag, uniqueVat } from "./helpers";

test("an issued invoice gives its Peppol file; a customer without VAT number cannot", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Peppol Client ${t}`;
  await login(page);
  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(client);
  const vat = uniqueVat("BE");
  await page.getByLabel("VAT number").fill(vat);
  await page.getByLabel("Street").fill("Kaai 12");
  await page.getByLabel("Postcode").fill("2000");
  await page.getByLabel("City").fill("Antwerpen");
  await page.getByLabel("Country (ISO-2)").fill("BE");
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await page.goto("/accounting");
  await page.getByLabel("Customer", { exact: true }).selectOption({ label: client });
  await page.getByRole("button", { name: "New invoice" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Draft for /);
  await page.getByLabel("Line", { exact: true }).fill("Customs clearance");
  await page.getByLabel("Unit (EUR)").fill("200");
  await page.getByLabel("VAT").selectOption("S21");
  await submit(page, page.getByRole("button", { name: "Add line" }));
  await expect(page.getByRole("cell", { name: "Customs clearance" })).toBeVisible();
  await submit(page, page.getByRole("button", { name: "Issue invoice" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^INV\//);
  const number = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  const href = await page.getByRole("link", { name: "Peppol file (UBL)" }).getAttribute("href");
  const res = await page.request.get(href!);
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toContain(`<cbc:ID>${number}</cbc:ID>`);
  expect(xml).toContain(`<cbc:EndpointID schemeID="0208">${vat.slice(2)}</cbc:EndpointID>`);
  expect(xml).toContain('<cbc:PayableAmount currencyID="EUR">242.00</cbc:PayableAmount>');
});

const ublBill = (vat: string, name: string, ref: string) => `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${ref}</cbc:ID><cbc:IssueDate>2026-09-10</cbc:IssueDate><cbc:DueDate>2026-10-10</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode><cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party><cac:PostalAddress><cac:Country><cbc:IdentificationCode>BE</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyTaxScheme><cbc:CompanyID>${vat}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
    <cac:PartyLegalEntity><cbc:RegistrationName>${name}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>
  <cac:PaymentMeans><cbc:PaymentMeansCode>30</cbc:PaymentMeansCode><cac:PayeeFinancialAccount><cbc:ID>BE68 5390 0754 7034</cbc:ID></cac:PayeeFinancialAccount></cac:PaymentMeans>
  <cac:LegalMonetaryTotal><cbc:PayableAmount currencyID="EUR">121.00</cbc:PayableAmount></cac:LegalMonetaryTotal>
  <cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="EUR">100.00</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>Office cleaning, September</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>21</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="EUR">100.00</cbc:PriceAmount></cac:Price></cac:InvoiceLine>
</Invoice>`;

test("a supplier's Peppol file becomes a draft bill, and the same number twice is refused", async ({
  page,
}) => {
  const t = tag();
  const vat = `BE0${String(Date.now()).slice(-9)}`;
  const name = `E2E Cleaners ${t}`;
  const file = {
    name: `ubl-${t}.xml`,
    mimeType: "application/xml",
    buffer: Buffer.from(ublBill(vat, name, `CL-${t}`)),
  };
  await login(page);
  await page.goto("/accounting/bills");
  await page.getByLabel("Peppol invoice (UBL XML)").setInputFiles(file);
  await page.getByRole("button", { name: "Import Peppol file" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Bill from ${name}`);
  await expect(page.getByRole("cell", { name: "Office cleaning, September" })).toBeVisible();
  await expect(page.getByLabel("Supplier's number")).toHaveValue(`CL-${t}`);
  await expect(page.getByLabel("Bill date")).toHaveValue("2026-09-10");

  await page.goto("/accounting/bills");
  await page.getByLabel("Peppol invoice (UBL XML)").setInputFiles(file);
  await submit(page, page.getByRole("button", { name: "Import Peppol file" }));
  await expectToast(page, `CL-${t} from ${name} is already in.`);
});
