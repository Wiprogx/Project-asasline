import type { Metadata } from "next";
import { LinesEditor } from "@/components/shared/lines-editor";
import { boxOwnerLines, containerSpecLines } from "@/domain/lookups";
import { saveBoxOwners, saveContainerSpecs } from "@/features/settings-tables/lookup-actions";
import { containerTablesForEdit } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Containers" };

/** Tare and maximum gross per type, and who owns a box by its prefix (legacy ctr / owners tabs). */
export default async function ContainerSettingsPage() {
  await requirePagePermission("app.settings");
  const { specs, owners } = await containerTablesForEdit();
  return (
    <div className="grid gap-4">
      <LinesEditor
        action={saveContainerSpecs}
        title="Container types — tare and maximum gross"
        description='One ISO type per line: "40HC | 3900 | 32500" — the empty weight the VGM takes when the box has none of its own, and the gross it may not exceed. The types offered on a booking are the list in Settings › Lists.'
        label="Container specs, one per line"
        submitLabel="Save container specs"
        lines={containerSpecLines(specs.rows)}
        version={specs.version}
        count={specs.rows.length}
      />
      <LinesEditor
        action={saveBoxOwners}
        title="Box owners"
        description='The four letters a container number starts with, and whose box it is: "MSCU | MSC". Shown next to the number on the booking.'
        label="Box owners, one per line"
        submitLabel="Save box owners"
        lines={boxOwnerLines(owners.rows)}
        version={owners.version}
        count={owners.rows.length}
      />
    </div>
  );
}
