import { isVatPeriod } from "@/domain/vat";
import { intraListingFile } from "@/features/accounting/listings-queries";
import { requirePagePermission } from "@/server/auth/dal";

/** One period's intra-community listing (services) as an Intervat draft. */
export async function GET(_req: Request, ctx: RouteContext<"/accounting/listings/intra/[period]">) {
  await requirePagePermission("app.accounting");
  const { period } = await ctx.params;
  if (!isVatPeriod(period)) return new Response("Not a VAT period", { status: 404 });
  return new Response(await intraListingFile(period), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="intracom-${period}.xml"`,
    },
  });
}
