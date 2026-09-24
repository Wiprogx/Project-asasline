import type { Metadata } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { contactOptions } from "@/features/contacts/queries";
import { PriceListForm } from "@/features/pricing/components/price-list-form";
import { PriceListsTable } from "@/features/pricing/components/price-lists-table";
import { listPriceLists } from "@/features/pricing/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Price lists" };

/** Customer agreements: an agreed price outranks the catalogue while the agreement is in force. */
export default async function PriceListsPage() {
  await requirePagePermission("catalogue.edit");
  const [rows, customers] = await Promise.all([listPriceLists(), contactOptions()]);
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">New agreement</h2>
          <p className="text-sm text-muted-foreground">
            Quotations take the customer&apos;s agreed price first, then — if the contact is set to
            it — the last price quoted, then the catalogue. One agreement in force per day.
          </p>
        </CardHeader>
        <CardContent>
          <PriceListForm customers={customers} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-2">
          <PriceListsTable rows={rows} today={officeToday()} />
        </CardContent>
      </Card>
    </div>
  );
}
