import { expect, test } from "./fixtures";
import { login, open, tag } from "./helpers";

test("a customer paying against documents: the booking's invoicing says when the money is expected", async ({
  page,
}) => {
  const client = `E2E Term Gate ${tag()}`;
  await login(page);
  await open(page, "/contacts/new");
  await page.getByLabel("Name", { exact: true }).fill(client);
  await page.getByLabel("Payment terms").selectOption({ label: "Documents against payment" });
  await page.getByRole("button", { name: "Create contact" }).click();
  await expect(page.getByRole("heading", { level: 1, name: client })).toBeVisible();

  await open(page, "/bookings/new");
  await page.getByLabel("Customer").selectOption({ label: client });
  await page.getByRole("button", { name: "Create booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^SB/);
  const id = page.url().split("/bookings/")[1];

  await open(page, `/bookings/${id}/billing`);
  await expect(
    page.getByText(
      "Payment terms: Documents against payment — payment is expected before the documents are released.",
    ),
  ).toBeVisible();
});
