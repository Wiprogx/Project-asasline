import { cityOptions } from "@/features/geo/queries";

/** The cities of `?country=BE` for the city fields (the feature checks the permission first). */
export async function GET(req: Request) {
  const country = new URL(req.url).searchParams.get("country") ?? "";
  return Response.json(await cityOptions(country), {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}
