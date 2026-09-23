import { z } from "zod";
import { peppolFile } from "@/features/accounting/peppol-queries";
import { requirePagePermission } from "@/server/auth/dal";

/** Downloads an issued invoice's Peppol UBL file, or says what the customer record lacks. */
export async function GET(_req: Request, ctx: RouteContext<"/accounting/invoices/[id]/ubl">) {
  await requirePagePermission("app.accounting");
  const id = z.uuid().safeParse((await ctx.params).id);
  if (!id.success) return new Response("No such invoice", { status: 404 });
  const file = await peppolFile(id.data);
  if ("problems" in file)
    return new Response(`No Peppol file yet: ${file.problems.join("; ")}.`, {
      status: 422,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  return new Response(file.xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="${file.filename}"`,
    },
  });
}
