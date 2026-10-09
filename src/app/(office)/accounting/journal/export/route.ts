import { periodOf } from "@/domain/period";
import { journalFile } from "@/features/accounting/listings-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";
import { auditAccess } from "@/server/access";

/** The period's journal as a CSV for the accountant (";" separated, comma decimals). */
export async function GET(req: Request) {
  const user = await requirePagePermission("app.accounting");
  const sp = new URL(req.url).searchParams;
  const period = periodOf(
    { from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined },
    officeToday(),
  );
  await auditAccess("export", {
    action: "journal.export",
    userId: user.id,
    detail: { from: period.from, to: period.to },
  });
  return new Response(await journalFile(period), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="journal-${period.from}-${period.to}.csv"`,
    },
  });
}
