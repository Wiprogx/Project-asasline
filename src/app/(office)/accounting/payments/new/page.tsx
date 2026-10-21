import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SplitPaymentForm } from "@/features/accounting/components/split-payment-form";
import { openInvoicesOfCustomer } from "@/features/accounting/split-payment-queries";
import { contactOptions } from "@/features/contacts/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Payment over several invoices" };

/** A customer's transfer that settles several invoices: the customer first, then the parts. */
export default async function SplitPaymentPage({
  searchParams,
}: PageProps<"/accounting/payments/new">) {
  await requirePagePermission("accounting.bank");
  const { customer } = await searchParams;
  const customerId = typeof customer === "string" ? customer : "";
  const [contacts, open] = await Promise.all([
    contactOptions(),
    customerId ? openInvoicesOfCustomer(customerId) : Promise.resolve([]),
  ]);
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Payment over several invoices"
        description="One transfer from a customer, each invoice taking its part."
      />
      <form className="flex flex-wrap items-end gap-2" method="get">
        <NativeSelect
          name="customer"
          aria-label="Customer"
          defaultValue={customerId}
          placeholder="Choose the customer…"
          className="w-72"
          options={contacts.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Button type="submit" variant="outline">
          Show open invoices
        </Button>
      </form>
      {customerId && (
        <Card>
          <CardContent className="pt-4">
            <SplitPaymentForm customerId={customerId} invoices={open} today={officeToday()} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
