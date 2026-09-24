import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ToneBadge } from "@/components/shared/tone-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { may } from "@/domain/permissions";
import {
  isVatPeriod,
  vatDeadline,
  vatPeriodOf,
  vatPeriodRange,
  vatPeriodShift,
} from "@/domain/vat";
import { CloseBooksForm, FileVatButton } from "@/features/accounting/components/vat-controls";
import { VatGrids, VatPeriodNav } from "@/features/accounting/components/vat-return";
import { vatScreen } from "@/features/accounting/vat-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "VAT return" };

export default async function VatPage({ searchParams }: PageProps<"/accounting/vat">) {
  const user = await requirePagePermission("app.accounting");
  const today = officeToday();
  const { p } = await searchParams;
  const period =
    typeof p === "string" && isVatPeriod(p)
      ? p
      : vatPeriodShift(vatPeriodOf(today, "quarterly"), -1);
  const { from, to } = vatPeriodRange(period);
  const { computed, filed, closedThrough } = await vatScreen(period);
  const grids = filed ? new Map(Object.entries(filed.filing.grids)) : computed.grids;
  const canClose = may(user, "accounting.closePeriods");
  return (
    <div className="grid gap-4">
      <PageHeader
        title={`VAT return ${period}`}
        description={`${from} to ${to} · ${computed.documents} documents · to file by ${vatDeadline(period)}`}
        actions={
          <>
            <a
              className={buttonVariants({ variant: "outline" })}
              href={`/accounting/vat/${period}/intervat`}
            >
              Intervat file (XML, draft)
            </a>
            {canClose && !filed && to < today && <FileVatButton period={period} />}
          </>
        }
      />
      <VatPeriodNav period={period} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {filed ? (
          <ToneBadge tone="success">
            Filed {officeToday(filed.filing.filedAt)} by {filed.by ?? "—"}
          </ToneBadge>
        ) : (
          <ToneBadge tone="warning">Not filed — confirm the grids with the accountant</ToneBadge>
        )}
        <span className="text-muted-foreground">
          {closedThrough ? `Books closed through ${closedThrough}` : "No period closed yet"}
        </span>
      </div>
      <VatGrids grids={grids} />
      {canClose && (
        <Card>
          <CardContent>
            <CloseBooksForm
              suggested={to < today ? to : vatPeriodRange(vatPeriodShift(period, -1)).to}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
