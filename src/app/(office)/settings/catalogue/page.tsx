import type { Metadata } from "next";
import Link from "next/link";
import { SearchInput } from "@/components/shared/search-input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RateItemForm } from "@/features/pricing/components/rate-item-form";
import { RateItemsTable } from "@/features/pricing/components/rate-items-table";
import { listRateItems, rateCategories } from "@/features/pricing/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Catalogue" };

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

/** One catalogue for everything chargeable: a quotation line, a booking charge, an invoice line. */
export default async function CataloguePage({ searchParams }: PageProps<"/settings/catalogue">) {
  await requirePagePermission("catalogue.edit");
  const sp = await searchParams;
  const category = str(sp.category);
  const archived = sp.archived === "1";
  const [categories, rows] = await Promise.all([
    rateCategories(),
    listRateItems({ q: str(sp.q), category, archived }),
  ]);
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
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">New item</h2>
        </CardHeader>
        <CardContent>
          <RateItemForm categories={categories} />
        </CardContent>
      </Card>
      <SearchInput placeholder="Search a port, carrier, document or name…" />
      <nav className="flex flex-wrap gap-2" aria-label="Categories">
        {chip("/settings/catalogue", "All", !category && !archived)}
        {categories.map((c) =>
          chip(`/settings/catalogue?category=${c.code}`, c.label, category === c.code),
        )}
        {chip("/settings/catalogue?archived=1", "Out of use", archived)}
      </nav>
      <Card>
        <CardContent className="pt-2">
          <RateItemsTable rows={rows} categories={categories} today={officeToday()} />
        </CardContent>
      </Card>
    </div>
  );
}
