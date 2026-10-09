import { officeCopy } from "@/features/audit/export-queries";
import { auditAccess } from "@/server/access";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

/** Downloads a full copy of the office as JSON (the query checks the permission; the export is recorded). */
export async function GET() {
  const user = await requirePagePermission("app.settings");
  const copy = await officeCopy();
  await auditAccess("export", {
    action: "office.export",
    userId: user.id,
    detail: { tables: Object.keys(copy.tables).length },
  });
  return new Response(JSON.stringify(copy), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="asasline-office-${officeToday()}.json"`,
      "cache-control": "private, no-store",
    },
  });
}
