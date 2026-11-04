import { cityOptions, citySearch } from "@/features/geo/queries";

/**
 * The cities of `?country=BE` for the city fields, or those `?q=antw` names in any country for
 * a place field (the feature checks the permission first).
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = params.get("q");
  const rows = q !== null ? await citySearch(q) : await cityOptions(params.get("country") ?? "");
  return Response.json(rows, { headers: { "Cache-Control": "private, max-age=300" } });
}
