import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { may } from "@/domain/permissions";
import { assetsScreen } from "@/features/accounting/asset-queries";
import { AssetsTable } from "@/features/accounting/components/assets-table";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Assets" };

export default async function AssetsPage() {
  const user = await requirePagePermission("app.accounting");
  const today = officeToday();
  const rows = await assetsScreen(today);
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Assets"
        description="Straight line, month by month from the month bought, booked at each month's end (630200 / 230900). Years to confirm with the accountant."
      />
      <Card>
        <CardContent className="pt-2">
          <AssetsTable rows={rows} today={today} canEdit={may(user, "accounting.issue")} />
        </CardContent>
      </Card>
    </div>
  );
}
