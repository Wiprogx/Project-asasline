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
        'One format per line: "country | vat or eori | pattern | what it expects | example". An EU number is judged by its register (VIES for a VAT number, the EORI register for an EORI), never by a pattern; a Belgian one also carries its check digits. Elsewhere a contact of a country with a format must match it, and a country without one is taken as written.'
      }
      label="Number formats, one per line"
      submitLabel="Save number formats"
      lines={idFormatLines(formats)}
      version={version}
      count={formats.length}
    />
  );
}
