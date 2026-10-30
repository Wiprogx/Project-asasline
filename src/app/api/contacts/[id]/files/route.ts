import { z } from "zod";
import { keepContactFile } from "@/features/contacts/file-store";

/** One paper onto the contact, from the uploader (the feature checks the permission first). */
export async function POST(req: Request, ctx: RouteContext<"/api/contacts/[id]/files">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const result = await keepContactFile(id, await req.formData());
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
