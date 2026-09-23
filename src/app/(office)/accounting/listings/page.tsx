import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { isVatPeriod, vatPeriodOf, vatPeriodShift } from "@/domain/vat";
import {
  ClientListingTable,
  IntraListingTable,
} from "@/features/accounting/components/listing-tables";
import { listingsScreen } from "@/features/accounting/listings-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Listings" };

function Head({ title, href, nav }: { title: string; href: string; nav: React.ReactNode }) {
  return (
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
      <h2 className="font-heading text-base font-medium">{title}</h2>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {nav}
        <a className={buttonVariants({ variant: "outline", size: "sm" })} href={href}>
          Listing file (XML, draft)
        </a>
      </div>
    </CardHeader>
  );
}

export default async function ListingsPage({ searchParams }: PageProps<"/accounting/listings">) {
  await requirePagePermission("app.accounting");
  const today = officeToday();
  const sp = await searchParams;
  const year =
    typeof sp.year === "string" && /^\d{4}$/.test(sp.year)
      ? sp.year
      : String(Number(today.slice(0, 4)) - 1);
  const period =
    typeof sp.p === "string" && isVatPeriod(sp.p) ? sp.p : vatPeriodOf(today, "quarterly");
  const { clients, intra } = await listingsScreen(year, period);
  const go = (y: string, p: string, label: string, name: string) => (
    <Link
      aria-label={name}
      className="px-1 text-muted-foreground hover:text-foreground"
      href={`/accounting/listings?year=${y}&p=${p}`}
    >
      {label}
    </Link>
  );
  return (
    <div className="grid gap-4">
      <PageHeader title="Listings" description="Drafts to check in Intervat before filing." />
      <Card>
        <Head
          title={`Annual listing of Belgian customers ${year}`}
          href={`/accounting/listings/client/${year}`}
          nav={
            <>
              {go(String(Number(year) - 1), period, "‹", "Previous year")}
              {go(String(Number(year) + 1), period, "›", "Next year")}
            </>
          }
        />
        <CardContent>
          <ClientListingTable rows={clients} />
        </CardContent>
      </Card>
      <Card>
        <Head
          title={`Intra-community listing ${period}`}
          href={`/accounting/listings/intra/${period}`}
          nav={
            <>
              {go(year, vatPeriodShift(period, -1), "‹", "Previous period")}
              {go(year, vatPeriodShift(period, 1), "›", "Next period")}
            </>
          }
        />
        <CardContent>
          <IntraListingTable rows={intra} />
        </CardContent>
      </Card>
    </div>
  );
}
