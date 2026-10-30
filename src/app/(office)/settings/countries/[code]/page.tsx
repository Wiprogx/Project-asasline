import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddCity, CityTable } from "@/features/geo/components/city-table";
import { GeoFilters } from "@/features/geo/components/geo-filters";
import { citiesForEdit, countryByCode } from "@/features/geo/queries";
import { requirePagePermission } from "@/server/auth/dal";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export async function generateMetadata({
  params,
}: PageProps<"/settings/countries/[code]">): Promise<Metadata> {
  const { code } = await params;
  return { title: `Cities · ${code.toUpperCase()}` };
}

/** One country's cities: what its contacts' city field offers (add, correct, merge, archive). */
export default async function CountryCitiesPage({
  params,
  searchParams,
}: PageProps<"/settings/countries/[code]">) {
  await requirePagePermission("app.settings");
  const [{ code }, sp] = await Promise.all([params, searchParams]);
  const country = await countryByCode(code);
  if (!country) notFound();
  const scope = {
    q: one(sp.q),
    archived: one(sp.archived) === "1",
    toCheck: one(sp.check) === "1",
  };
  const rows = await citiesForEdit(country.code, scope);
  return (
    <div className="grid gap-3">
      <Link href="/settings/countries" className="text-sm text-muted-foreground hover:underline">
        ← All countries
      </Link>
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="grid gap-1.5">
            <CardTitle>
              {country.name} ({country.code}) — cities
            </CardTitle>
            <CardDescription>
              The biggest first, 200 at a time: search by name, other name or region. &ldquo;To
              check&rdquo; are the cities not from the list — added here, or kept from a
              contact&rsquo;s words; one typed wrong is merged into the right city, and its contacts
              move with it.
            </CardDescription>
          </div>
          <AddCity country={country.code} />
        </CardHeader>
        <CardContent className="grid gap-4">
          <GeoFilters
            q={scope.q}
            archived={scope.archived}
            toCheck={scope.toCheck}
            placeholder="City, other name or region"
          />
          <CityTable rows={rows} country={country.code} />
        </CardContent>
      </Card>
    </div>
  );
}
