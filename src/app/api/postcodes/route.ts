import { z } from "zod";
import { postcodeOptions } from "@/features/geo/queries";

/** The postcodes of `?country=BE` starting with `?q=26`, `?city=` first (the feature checks the permission first). */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const city = p.get("city");
  const cityId = city && z.uuid().safeParse(city).success ? city : null;
  return Response.json(await postcodeOptions(p.get("country") ?? "", p.get("q") ?? "", cityId));
}
