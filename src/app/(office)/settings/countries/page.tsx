import type { Metadata } from "next";
import { LinesEditor } from "@/components/shared/lines-editor";
import { countryLines } from "@/domain/countries";
import { countriesForEdit } from "@/features/settings-tables/country-queries";
import { saveCountries } from "@/features/settings-tables/lookup-actions";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Countries" };

/** The countries the office ships to, with their dial code and language (legacy Settings › Countries). */
export default async function CountriesPage() {
  await requirePagePermission("app.settings");
  const { countries, version } = await countriesForEdit();
  return (
    <LinesEditor
      action={saveCountries}
      title="Countries"
      description={
        'One country per line: "code | name | dial code | language". The code is what a contact\'s country field takes, the name is what lists show, and a new contact of that country is written to in that language unless one is chosen.'
      }
      label="Countries, one per line"
      submitLabel="Save countries"
      lines={countryLines(countries)}
      version={version}
      count={countries.length}
    />
  );
}
