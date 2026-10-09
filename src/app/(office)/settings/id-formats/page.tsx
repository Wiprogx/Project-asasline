import type { Metadata } from "next";
import { LinesEditor } from "@/components/shared/lines-editor";
import { idFormatLines } from "@/domain/contacts";
import { saveIdFormats } from "@/features/settings-tables/lookup-actions";
import { idFormatsForEdit } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Number formats" };

/** What a VAT or EORI number looks like per country (legacy ID_FORMATS tab). */
export default async function IdFormatsPage() {
  await requirePagePermission("app.settings");
  const { formats, version } = await idFormatsForEdit();
  return (
    <LinesEditor
      action={saveIdFormats}
      title="VAT and EORI number formats"
      description={
        'One format per line: "country | vat or eori | pattern | what it expects | example". A contact of a country with a format must match it; a country without one is taken as written. Belgian numbers also carry their check digits.'
      }
      label="Number formats, one per line"
      submitLabel="Save number formats"
      lines={idFormatLines(formats)}
      version={version}
      count={formats.length}
    />
  );
}
