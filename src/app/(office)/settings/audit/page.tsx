import type { Metadata } from "next";
import { SearchInput } from "@/components/shared/search-input";
import { AuditTable } from "@/features/audit/components/audit-table";
import { listAudit } from "@/features/audit/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: PageProps<"/settings/audit">) {
  await requirePagePermission("audit.view");
  const sp = await searchParams;
  const rows = await listAudit({ action: typeof sp.q === "string" ? sp.q : undefined });
  return (
    <>
      <div className="mb-4">
        <SearchInput placeholder="Filter by action: login, booking., user.…" />
      </div>
      <AuditTable rows={rows} />
    </>
  );
}
