import { expect, test } from "./fixtures";
import { expectToast, login, submit, tag } from "./helpers";

test("an all-inclusive quotation is printed and sent, with a follow-up for tomorrow", async ({
  page,
}) => {
  const t = tag();
  const client = `E2E Send Client ${t}`;
  // Capture what the app hands to the mail client instead of opening one.
  await page.addInitScript(() => {
    (window as unknown as { opened: string[] }).opened = [];
    window.open = (url?: string | URL) => {
      (window as unknown as { opened: string[] }).opened.push(String(url));
      return null;
    };
    window.print = () => undefined;
  });
  await login(page);

  await page.goto("/contacts/new");
  await page.getByLabel("Name").fill(client);
  await page.getByLabel("Email").fill(`send.${t}@example.com`);
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await page.goto("/quotations/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByLabel("Port of loading").fill("BEANR");
  await page.getByLabel("Port of discharge").fill("TRMER");
  await page.getByLabel("Service").fill("Ocean freight to Mersin");
  await page.getByLabel("Sell (EUR)").fill("1900");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^QT/);
  const ref = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  const url = page.url();
  await page.getByLabel("Or a service typed").fill("Terminal handling");
  await page.getByLabel("Sell (EUR)").fill("210");
  await submit(page, page.getByRole("button", { name: "Add line" }));
  await expectToast(page, "Line added");
  // Each edit re-renders the page with the quotation's new version; wait for it before the next.
  const handling = page.getByRole("row").filter({ hasText: "Terminal handling" });
  await expect(handling).toBeVisible();

  // All-inclusive, naming the freight but not the handling.
  await submit(page, page.getByRole("button", { name: "All-inclusive" }));
  await expectToast(page, "Presentation changed");
  await expect(page.getByRole("columnheader", { name: "On the document" })).toBeVisible();
  await submit(page, handling.getByRole("button", { name: "Named" }));
  await expectToast(page, "Saved");
  await expect(handling.getByRole("button", { name: "Not named" })).toBeVisible();

  await page.goto(url.replace("/quotations/", "/print/quotations/"));
  await expect(page.getByRole("heading", { name: "Quotation" })).toBeVisible();
  await expect(page.getByText("BEANR › TRMER")).toBeVisible();
  await expect(page.getByText("€2,110.00")).toBeVisible();
  await expect(page.getByText("Ocean freight to Mersin")).toBeVisible();
  await expect(page.getByText("Terminal handling")).toHaveCount(0);

  // Sent: recorded, opened in the mail app, a follow-up for tomorrow.
  await page.goto(url);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const d = page.getByRole("dialog");
  await expect(d.getByLabel("To")).toHaveValue(`send.${t}@example.com`);
  await expect(d.getByLabel("Subject")).toHaveValue(`Quotation ${ref} — BEANR › TRMER · 40HC`);
  await expect(d.getByLabel("Message")).toHaveValue(/Total: €2,110\.00/);
  await submit(page, d.getByRole("button", { name: "Record and open" }));
  await expectToast(page, "Recorded as sent — opening it to send");
  const opened = await page.evaluate(() => (window as unknown as { opened: string[] }).opened);
  expect(opened[0].startsWith(`mailto:send.${t}%40example.com?subject=Quotation%20${ref}`)).toBe(
    true,
  );
  await expect(page.getByText("Sent", { exact: true })).toBeVisible();
  await expect(page.getByText(/sent \d{4}-\d{2}-\d{2} by e-mail/)).toBeVisible();
  await page.goto("/activity?when=all");
  await expect(page.getByText(`Ask ${client} whether ${ref} is agreed`)).toBeVisible();
});
