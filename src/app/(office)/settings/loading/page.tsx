import type { Metadata } from "next";
import { LinesEditor } from "@/components/shared/lines-editor";
import { LoadingModesEditor } from "@/features/settings-tables/components/loading-modes-editor";
import { saveLoadingGrace } from "@/features/settings-tables/lookup-actions";
import { surchargeItemNames } from "@/features/settings-tables/mode-queries";
import { loadingModesForEdit } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Loading modes" };

export default async function LoadingModesPage() {
  await requirePagePermission("app.settings");
  const [{ modes, version, grace }, items] = await Promise.all([
    loadingModesForEdit(),
    surchargeItemNames(),
  ]);
  return (
    <div className="grid gap-4">
      <LoadingModesEditor modes={modes} version={version} items={items} />
      <LinesEditor
        action={saveLoadingGrace}
        title="Grace before waiting time"
        description="Minutes a direct loading may run over the hours its mode includes before the extra time is charged (legacy LOADING_GRACE_H). One number."
        label="Grace in minutes"
        submitLabel="Save the grace"
        lines={String(grace.minutes)}
        version={grace.version}
        count={1}
      />
    </div>
  );
}
