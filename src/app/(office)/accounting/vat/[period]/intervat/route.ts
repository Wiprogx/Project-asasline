import { isVatPeriod } from "@/domain/vat";
import { intervatFile } from "@/features/accounting/vat-queries";
import { requirePagePermission } from "@/server/auth/dal";

/** Downloads the period's Intervat XML (a draft for Intervat's own check). */
export async function GET(_req: Request, ctx: RouteContext<"/accounting/vat/[period]/intervat">) {
  await requirePagePermission("app.accounting");
  const { period } = await ctx.params;
  if (!isVatPeriod(period)) return new Response("Not a VAT period", { status: 404 });
  return new Response(await intervatFile(period), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="intervat-${period}.xml"`,
    },
  });
}
