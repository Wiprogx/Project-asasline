import type { Metadata } from "next";
import { LinesEditor } from "@/components/shared/lines-editor";
import { hsCodeLines } from "@/domain/goods";
import { saveHsCodes } from "@/features/settings-tables/actions";
import { hsCodesForEdit } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "HS codes" };

const DESCRIPTION =
  'The commodity codes offered on the goods lines of a container, one per line: "630900 | Worn clothing and other worn articles". Six digits of the Harmonised System; a code not in the list is still accepted on a box.';

export default async function HsCodesPage() {
  await requirePagePermission("app.settings");
  const { codes, version } = await hsCodesForEdit();
  return (
    <LinesEditor
      action={saveHsCodes}
      title="HS codes"
      description={DESCRIPTION}
      label="HS codes, one per line"
      submitLabel="Save HS codes"
      lines={hsCodeLines(codes)}
      version={version}
      count={codes.length}
    />
  );
}
