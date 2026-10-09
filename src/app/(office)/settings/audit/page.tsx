import type { Metadata } from "next";
import { SearchInput } from "@/components/shared/search-input";
import { AuditTable } from "@/features/audit/components/audit-table";
import { listAudit } from "@/features/audit/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { accessWatchForEdit } from "@/features/settings-tables/queries";
import { AccessWatchForm } from "@/features/settings-tables/components/access-watch-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: PageProps<"/settings/audit">) {
  await requirePagePermission("audit.view");
  const sp = await searchParams;
  const [rows, access] = await Promise.all([
    listAudit({ action: typeof sp.q === "string" ? sp.q : undefined }),
    accessWatchForEdit(),
  ]);
  return (
    <div className="grid gap-4">
      <AccessWatchForm watch={access.watch} version={access.version} />
      <Card>
        <CardHeader>
          <CardTitle>A copy of the office</CardTitle>
          <CardDescription>
            Every business table as it stands, as one JSON file — for the accountant, a migration or
            a backup. People come with their name and role only; the export itself is recorded when
            the office records exports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            className={buttonVariants({ variant: "outline", size: "sm" })}
            href="/api/export/office"
          >
            Download the copy (JSON)
          </a>
        </CardContent>
      </Card>
      <div>
        <SearchInput placeholder="Filter by action: login, booking., user.…" />
      </div>
      <AuditTable rows={rows} />
    </div>
  );
}
