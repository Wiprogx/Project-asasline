import { z } from "zod";
import { placesOf } from "@/features/contacts/place-queries";

/** Where a customer's box can be loaded, its delivery addresses first (the feature checks the permission). */
export async function GET(_req: Request, ctx: RouteContext<"/api/contacts/[id]/places">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  return Response.json(await placesOf(id));
}
