import { clientListingFile } from "@/features/accounting/listings-queries";
import { requirePagePermission } from "@/server/auth/dal";

/** The annual listing of Belgian customers as an Intervat draft. */
export async function GET(_req: Request, ctx: RouteContext<"/accounting/listings/client/[year]">) {
  await requirePagePermission("app.accounting");
  const { year } = await ctx.params;
  if (!/^\d{4}$/.test(year)) return new Response("Not a year", { status: 404 });
  return new Response(await clientListingFile(year), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="client-listing-${year}.xml"`,
    },
  });
}
