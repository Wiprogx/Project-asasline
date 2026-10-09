import type { Metadata } from "next";
import { LinesEditor } from "@/components/shared/lines-editor";
import { loadingModeLines } from "@/domain/loading";
import { saveLoadingModes } from "@/features/settings-tables/actions";
import { loadingModesForEdit } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Loading modes" };

export default async function LoadingModesPage() {
  await requirePagePermission("app.settings");
  const { modes, version } = await loadingModesForEdit();
  return (
    <LinesEditor
      action={saveLoadingModes}
      title="Loading modes"
      description='How a box is loaded and how long the truck may stay — chosen on a quotation (it decides the price) and on each box of a booking. One per line: "name | hours included | direct or drop | surcharge catalogue item | quantity". A drop mode leaves the box on site; its days are charged from the free-time terms.'
      label="Loading modes, one per line"
      submitLabel="Save loading modes"
      lines={loadingModeLines(modes)}
      version={version}
      count={modes.length}
    />
  );
}
