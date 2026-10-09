import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VatMonthsTable } from "@/features/accounting/components/vat-months-table";
import { vatByMonth } from "@/features/accounting/vat-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "VAT by month" };

/** The year month by month (legacy VAT by month), each month opening its own return. */
export default async function VatByMonthPage({
  searchParams,
}: PageProps<"/accounting/vat/by-month">) {
  await requirePagePermission("app.accounting");
  const today = officeToday();
  const { year: y } = await searchParams;
  const year = typeof y === "string" && /^\d{4}$/.test(y) ? y : today.slice(0, 4);
  const rows = await vatByMonth(year, today);
  const other = String(Number(year) - 1);
  return (
    <div className="grid gap-4">
      <PageHeader
        title={`VAT by month ${year}`}
        description="What each month would declare, as the documents dated in it stand now."
        actions={
          <>
            <Link
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              href={`/accounting/vat/by-month?year=${other}`}
            >
              {other}
            </Link>
            <Link
              className={buttonVariants({ variant: "outline", size: "sm" })}
              href="/accounting/vat"
            >
              The return
            </Link>
          </>
        }
      />
      <Card>
        <CardContent className="pt-2">
          <VatMonthsTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
