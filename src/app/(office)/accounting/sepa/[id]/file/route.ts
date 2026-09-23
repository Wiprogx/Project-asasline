import { z } from "zod";
import { sepaFile } from "@/features/accounting/sepa-queries";
import { requirePagePermission } from "@/server/auth/dal";

/** Downloads a SEPA file (pain.001) exactly as it was made. */
export async function GET(_req: Request, ctx: RouteContext<"/accounting/sepa/[id]/file">) {
  await requirePagePermission("app.accounting");
  const id = z.uuid().safeParse((await ctx.params).id);
  const file = id.success ? await sepaFile(id.data) : null;
  if (!file) return new Response("No such SEPA file", { status: 404 });
  return new Response(file.xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="sepa-${file.executionDate}.xml"`,
    },
  });
}
