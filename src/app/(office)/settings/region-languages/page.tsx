import type { Metadata } from "next";
import { LinesEditor } from "@/components/shared/lines-editor";
import { regionLanguageLines } from "@/domain/region-languages";
import { saveRegionLanguages } from "@/features/settings-tables/region-actions";
import { regionLanguagesForEdit } from "@/features/settings-tables/status-queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Regional languages" };

/** The regions written to in another language than their country's: Flanders in Dutch. */
export default async function RegionLanguagesPage() {
  await requirePagePermission("app.settings");
  const { rows, version } = await regionLanguagesForEdit();
  return (
    <LinesEditor
      action={saveRegionLanguages}
      title="Regional languages"
      description={
        'One rule per line: "country | region | language". A new contact there is written to in that language instead of the country\'s (Settings › Countries) unless one is chosen by hand. The region is the city\'s region as Settings › Countries spells it ("Flanders"), or a postcode range ("1500-3999") read as soon as the postcode is typed; the first rule that fits decides. Languages: en, fr, nl, tr, ar.'
      }
      label="Regional languages, one per line"
      submitLabel="Save regional languages"
      lines={regionLanguageLines(rows)}
      version={version}
      count={rows.length}
    />
  );
}
