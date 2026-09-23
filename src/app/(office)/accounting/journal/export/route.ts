import { periodOf } from "@/domain/period";
import { journalFile } from "@/features/accounting/listings-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

/** The period's journal as a CSV for the accountant (";" separated, comma decimals). */
export async function GET(req: Request) {
  await requirePagePermission("app.accounting");
  const sp = new URL(req.url).searchParams;
  const period = periodOf(
    { from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined },
    officeToday(),
  );
  return new Response(await journalFile(period), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="journal-${period.from}-${period.to}.csv"`,
    },
  });
}
