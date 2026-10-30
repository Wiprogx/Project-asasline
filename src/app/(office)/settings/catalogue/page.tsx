import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RATE_CATEGORIES } from "@/domain/pricing";
import { NewRateItemDialog } from "@/features/pricing/components/new-rate-item-dialog";
import { RateItemsTable } from "@/features/pricing/components/rate-items-table";
import { catalogueLists, listRateItems } from "@/features/pricing/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { readRateSources } from "@/server/rate-sources-config";

export const metadata: Metadata = { title: "Catalogue" };

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

/**
 * One catalogue for everything chargeable: a quotation line, a booking charge, an invoice line.
 * The list with its categories, filters and search; a new item is made in a dialog.
 */
export default async function CataloguePage({ searchParams }: PageProps<"/settings/catalogue">) {
  await requirePagePermission("catalogue.edit");
  const sp = await searchParams;
  const category = str(sp.category);
  const archived = sp.archived === "1";
  const [rows, sources, lists] = await Promise.all([
    listRateItems({ q: str(sp.q), category, archived }),
    readRateSources(),
    catalogueLists(),
  ]);
  const categories = [...RATE_CATEGORIES];
  const chip = (href: string, label: string, on: boolean) => (
    <Link
      key={href}
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs",
        on && "bg-primary text-primary-foreground",
      )}
    >
      {label}
    </Link>
  );
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap gap-2" aria-label="Categories">
          {chip("/settings/catalogue", "All", !category && !archived)}
          {categories.map((c) =>
            chip(`/settings/catalogue?category=${c.code}`, c.label, category === c.code),
          )}
          {chip("/settings/catalogue?archived=1", "Out of use", archived)}
        </nav>
        <NewRateItemDialog lists={lists} sources={sources} />
      </div>
      <Card>
        <CardContent className="pt-2">
          <RateItemsTable
            rows={rows}
            categories={categories}
            today={officeToday()}
            sources={sources}
          />
        </CardContent>
      </Card>
    </div>
  );
}
