import { expect, test } from "./fixtures";
import { expectToast, login, open, submit, tag } from "./helpers";

test("a quotation edited, rejected, reopened, cancelled and put back; lost once every destination is declined", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Status Client ${t}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await open(page, "/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Service").fill("Ocean freight to Mersin");
  await page.getByLabel("Sell (EUR)").fill("900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  const header = page.locator("h1 + p");
  await expect(header).toContainText("Draft");

  // The quotation's own fields, after it was made.
  await page.getByRole("button", { name: "Edit quotation" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Commodity (HS)").fill("Used clothing 630900");
  await dialog.getByLabel("Valid until").fill("2031-12-31");
  await submit(page, dialog.getByRole("button", { name: "Save quotation" }));
  await expectToast(page, "Quotation saved");
  await expect(header).toContainText("valid until 2031-12-31");
  await page.getByRole("button", { name: "Edit quotation" }).click();
  await expect(page.getByRole("dialog").getByLabel("Commodity (HS)")).toHaveValue(
    "Used clothing 630900",
  );
  await page.keyboard.press("Escape");

  // Rejected with a reason, then reopened from the status.
  await page.getByRole("button", { name: "Reject" }).click();
  await page
    .getByPlaceholder("Why? It stays on the record.")
    .fill("Price higher than a competitor");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Mark as rejected" }));
  await expectToast(page, "Marked as rejected");
  await expect(header).toContainText("Declined");
  await expect(header).toContainText("Price higher than a competitor");
  await page.getByLabel("Status").selectOption("sent");
  await submit(page, page.getByRole("button", { name: "Set", exact: true }));
  await expectToast(page, "Status updated");
  await expect(header).toContainText("Sent");
  await expect(header).not.toContainText("Price higher");

  // Cancelled with a reason from the list, then put back where it was.
  await page.getByRole("button", { name: "Cancel quotation" }).click();
  await page.getByRole("dialog").getByLabel("Reason").selectOption({ index: 1 });
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Cancel it" }));
  await expectToast(page, "Quotation cancelled");
  await expect(header).toContainText("Cancelled");
  await expect(page.getByRole("button", { name: "Edit quotation" })).toHaveCount(0);
  await submit(page, page.getByRole("button", { name: "Put back" }));
  await expectToast(page, "Quotation put back");
  await expect(header).toContainText("Sent");

  // Its only destination declined: the quotation is lost; put back, it is open again.
  await page.getByRole("button", { name: "Declined" }).click();
  await page.getByPlaceholder("Why? It stays on the record.").fill("Went with another forwarder");
  await submit(page, page.getByRole("dialog").getByRole("button", { name: "Mark declined" }));
  await expectToast(page, "Marked as declined");
  await expect(header).toContainText("Declined");
  await expect(header).toContainText("Every destination declined");
  await submit(page, page.getByRole("button", { name: "Put back" }));
  await expectToast(page, "Destination back on the quotation");
  // Its "sent" was only set by hand, never sent out: it reopens as a draft.
  await expect(header).toContainText("Draft");
});
