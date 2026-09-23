import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { can } from "@/domain/permissions";
import { AutoMatch, ImportStatement } from "@/features/accounting/components/bank-controls";
import { BankLines } from "@/features/accounting/components/bank-lines";
import { bankLinesWithProposals } from "@/features/accounting/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Bank" };

export default async function BankPage() {
  const user = await requirePagePermission("app.accounting");
  const rows = await bankLinesWithProposals();
  const canAct = can(user.role, "accounting.bank");
  const open = rows.filter((r) => r.line.state === "open").length;
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Bank"
        description={`${open} line${open === 1 ? "" : "s"} to match · CODA or CSV statements`}
        actions={
          canAct && (
            <div className="flex flex-wrap items-center gap-2">
              <ImportStatement />
              <AutoMatch />
            </div>
          )
        }
      />
      <Card>
        <CardContent className="pt-2">
          <BankLines rows={rows} canAct={canAct} />
        </CardContent>
      </Card>
    </div>
  );
}
