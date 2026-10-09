import { z } from "zod";
import { invoiceFileForDownload } from "@/features/accounting/file-queries";

/** Sends a file kept with an invoice to the browser (the query checks the permission first). */
export async function GET(_req: Request, ctx: RouteContext<"/api/invoices/[id]/files/[fileId]">) {
  const { id, fileId } = await ctx.params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(fileId).success)
    return new Response("Not found", { status: 404 });
  const f = await invoiceFileForDownload(id, fileId);
  if (!f) return new Response("Not found", { status: 404 });
  const ascii = f.name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  return new Response(f.stream, {
    headers: {
      "content-type": f.mime,
      "content-length": String(f.size),
      "content-disposition": `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      "cache-control": "private, no-store",
    },
  });
}
