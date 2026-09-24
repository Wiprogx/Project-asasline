import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RateItemArchive } from "@/features/pricing/components/rate-item-archive";
import { RateItemForm } from "@/features/pricing/components/rate-item-form";
import { getRateItem, rateCategories } from "@/features/pricing/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Catalogue item" };

/** One item: a new price applies to what is priced from now on; quoted lines keep theirs. */
export default async function RateItemPage({ params }: PageProps<"/settings/catalogue/[id]">) {
  await requirePagePermission("catalogue.edit");
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const [it, categories] = await Promise.all([getRateItem(id.data), rateCategories()]);
  if (!it) notFound();
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div className="grid gap-1">
          <h2 className="font-heading text-base font-medium">{it.label}</h2>
          <p className="text-sm text-muted-foreground">
            A new price applies to quotations priced from now on; lines already quoted keep theirs.
          </p>
          {it.archivedAt && <ToneBadge tone="neutral">Out of use — {it.archivedReason}</ToneBadge>}
        </div>
        <RateItemArchive id={it.id} archived={!!it.archivedAt} />
      </CardHeader>
      <CardContent>
        <RateItemForm categories={categories} values={it} />
      </CardContent>
    </Card>
  );
}
