import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { expectToast, login, submit, tag } from "./helpers";

test("a supplier's IBAN, a bill paid by a SEPA file, and a refused file cancelled", async ({
  page,
}) => {
  const t = tag();
  const supplier = `E2E SEPA Haulier ${t}`;
  await login(page);
  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(supplier);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: supplier })).toBeVisible();

  // The IBAN is checked (mod 97) before it is kept.
  await page.getByLabel("IBAN").fill("BE68 5390 0754 7035");
  await submit(page, page.getByRole("button", { name: "Add IBAN" }));
  await expect(page.getByText("Not a valid IBAN")).toBeVisible();
  await page.getByLabel("IBAN").fill("be68 5390 0754 7034");
  await submit(page, page.getByRole("button", { name: "Add IBAN" }));
  await expectToast(page, "IBAN added");
  await expect(page.getByText("BE68 5390 0754 7034")).toBeVisible();

  await page.goto("/accounting/bills");
  await page.getByLabel("Supplier", { exact: true }).selectOption({ label: supplier });
  await page.getByRole("button", { name: "New bill" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Bill from ${supplier}`);
  await page.getByLabel("Line", { exact: true }).fill("Trucking to Zeebrugge");
  await page.getByLabel("Unit (EUR)").fill("400");
  await submit(page, page.getByRole("button", { name: "Add line" }));
  await expect(page.getByRole("cell", { name: "Trucking to Zeebrugge" })).toBeVisible();
  await page.getByLabel("Supplier's number").fill(`T-${t}`);
  await submit(page, page.getByRole("button", { name: "Record bill" }));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^BILL\//);
  const number = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();

  await page.goto("/accounting/sepa");
  const pay = page.getByRole("checkbox", { name: `Pay ${number}` });
  await pay.check();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    submit(page, page.getByRole("button", { name: "Make SEPA file" })),
  ]);
  const xml = await readFile((await download.path())!, "utf8");
  expect(xml).toContain("urn:iso:std:iso:20022:tech:xsd:pain.001.001.03");
  expect(xml).toContain(
    `<EndToEndId>${number}</EndToEndId></PmtId><Amt><InstdAmt Ccy="EUR">484.00</InstdAmt>`,
  );
  expect(xml).toContain("<IBAN>BE68539007547034</IBAN>");
  expect(xml).toContain(`<Ustrd>T-${t} ${number}</Ustrd>`);

  // In a file: not offered again — until the file is cancelled.
  await page.reload();
  await expect(pay).toBeDisabled();
  await expect(page.getByRole("listitem").filter({ hasText: number })).toContainText(
    "Already in a SEPA file",
  );
  const msgId = /<MsgId>([^<]+)<\/MsgId>/.exec(xml)![1];
  const file = page.getByRole("row").filter({ hasText: msgId });
  await file.getByRole("button", { name: "Cancel file" }).click();
  await page.getByRole("dialog").getByRole("textbox").fill("Refused by the bank");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Cancel file" }));
  await expectToast(page, /its bills can be paid again/);
  await expect(pay).toBeEnabled();
});
