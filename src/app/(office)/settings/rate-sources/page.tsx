import type { Metadata } from "next";
import { LinesEditor } from "@/components/shared/lines-editor";
import { rateSourceLines } from "@/domain/rate-sources";
import { saveRateSources } from "@/features/settings-tables/source-actions";
import { rateSourcesForEdit } from "@/features/settings-tables/status-queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Rate sources" };

/** Where a catalogue rate comes from (legacy Settings › Rate sources). */
export default async function RateSourcesPage() {
  await requirePagePermission("app.settings");
  const { sources, version } = await rateSourcesForEdit();
  return (
    <LinesEditor
      action={saveRateSources}
      title="Rate sources"
      description={
        'One source per line: "key | Label". A catalogue item names its source by the key; a contract rate holds until its date, a spot rate is confirmed per shipment. Items keep their key if a source is removed.'
      }
      label="Rate sources, one per line"
      submitLabel="Save rate sources"
      lines={rateSourceLines(sources)}
      version={version}
      count={sources.length}
    />
  );
}
