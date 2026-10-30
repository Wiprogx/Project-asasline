import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddCountry, CountryTable } from "@/features/geo/components/country-table";
import { GeoFilters } from "@/features/geo/components/geo-filters";
import { countriesForEdit } from "@/features/geo/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Countries" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

/** The countries (legacy Settings › Countries): every ISO country, each with its cities. */
export default async function CountriesPage({ searchParams }: PageProps<"/settings/countries">) {
  await requirePagePermission("app.settings");
  const sp = await searchParams;
  const scope = { q: one(sp.q), archived: one(sp.archived) === "1" };
  const rows = await countriesForEdit(scope);
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-1.5">
          <CardTitle>Countries</CardTitle>
          <CardDescription>
            Every ISO country, offered on the country fields: the name the lists show, the dial code
            of its phones and the language a new contact there is written to. A country&rsquo;s
            cities are what its contacts&rsquo; city field offers — open a country to add, correct
            or merge them.
          </CardDescription>
        </div>
        <AddCountry />
      </CardHeader>
      <CardContent className="grid gap-4">
        <GeoFilters q={scope.q} archived={scope.archived} placeholder="Name or ISO code" />
        <CountryTable rows={rows} />
      </CardContent>
    </Card>
  );
}
