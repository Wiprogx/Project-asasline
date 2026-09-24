import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { contactOptions } from "@/features/contacts/queries";
import { AgreedPrices } from "@/features/pricing/components/agreed-prices";
import { PriceListForm } from "@/features/pricing/components/price-list-form";
import { archivePriceList } from "@/features/pricing/list-actions";
import { getPriceList, rateItemOptions } from "@/features/pricing/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Agreement" };

export default async function PriceListPage({ params }: PageProps<"/settings/price-lists/[id]">) {
  await requirePagePermission("catalogue.edit");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const [list, customers, items] = await Promise.all([
    getPriceList(id.data),
    contactOptions(),
    rateItemOptions(),
  ]);
  if (!list) notFound();
  const withdrawn = !!list.archivedAt;
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div className="grid gap-1">
            <h2 className="font-heading text-base font-medium">{list.name}</h2>
            <Link className="text-sm hover:underline" href={`/contacts/${list.contact.id}`}>
              {list.contact.name}
            </Link>
            {withdrawn && <ToneBadge tone="neutral">Withdrawn — {list.archivedReason}</ToneBadge>}
          </div>
          {!withdrawn && (
            <ReasonDialog
              action={archivePriceList}
              hidden={{ id: list.id }}
              trigger="Withdraw"
              title="Withdraw this agreement?"
              description="Quotations for this customer fall back to the catalogue. The agreement stays on the record."
              confirmLabel="Withdraw"
            />
          )}
        </CardHeader>
        {!withdrawn && (
          <CardContent>
            <PriceListForm customers={customers} values={list} />
          </CardContent>
        )}
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">Agreed prices</h2>
        </CardHeader>
        <CardContent>
          <AgreedPrices priceListId={list.id} lines={list.lines} items={items} />
        </CardContent>
      </Card>
    </div>
  );
}
