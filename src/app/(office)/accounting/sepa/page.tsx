import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { addDays } from "@/domain/dates";
import { may } from "@/domain/permissions";
import { SepaBatches } from "@/features/accounting/components/sepa-batches";
import { SepaForm } from "@/features/accounting/components/sepa-form";
import { sepaScreen } from "@/features/accounting/sepa-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Pay suppliers" };

export default async function SepaPage() {
  const user = await requirePagePermission("app.accounting");
  const today = officeToday();
  const { bills, batches } = await sepaScreen();
  const canPay = may(user, "accounting.bank");
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Pay suppliers"
        description="A SEPA file (pain.001) to import at the bank. Each payment is booked when the statement shows it and is matched."
      />
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">Open bills</h2>
        </CardHeader>
        <CardContent>
          {canPay ? (
            <SepaForm bills={bills} payBy={addDays(today, 7)} tomorrow={addDays(today, 1)} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Paying suppliers needs the bank permission.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">Files made</h2>
        </CardHeader>
        <CardContent>
          <SepaBatches rows={batches} canCancel={canPay} />
        </CardContent>
      </Card>
    </div>
  );
}
