import type { Metadata } from "next";
import { LinesEditor } from "@/components/shared/lines-editor";
import { releaseStateLines, sendModeLines, trackStepLines } from "@/domain/release";
import {
  saveReleaseStates,
  saveSendModes,
  saveTrackSteps,
} from "@/features/settings-tables/actions";
import { releaseTablesForEdit } from "@/features/settings-tables/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Release & tracking" };

export default async function ReleaseSettingsPage() {
  await requirePagePermission("app.settings");
  const { release, send, track } = await releaseTablesForEdit();
  return (
    <div className="grid gap-4">
      <LinesEditor
        action={saveReleaseStates}
        title="Release states"
        description='Where a shipment stands for the consignee, one per line: "code | Label | hold or free | hint". A hold blocks collection and opens a task to clear it. Paper document types (the originals block) are in Settings › Lists.'
        label="Release states, one per line"
        submitLabel="Save release states"
        lines={releaseStateLines(release.rows)}
        version={release.version}
        count={release.rows.length}
      />
      <LinesEditor
        action={saveSendModes}
        title="Ways to send the originals"
        description='One per line: "name | tracks or no | tracking page". The waybill number is appended to the tracking page to open the courier’s own page.'
        label="Send modes, one per line"
        submitLabel="Save send modes"
        lines={sendModeLines(send.rows)}
        version={send.version}
        count={send.rows.length}
      />
      <LinesEditor
        action={saveTrackSteps}
        title="Journey steps"
        description='The milestones of a shipment in order, one per line: "name | auto or manual". A new booking starts its journey with this list; auto steps are confirmed by hand until a carrier feed does it.'
        label="Journey steps, one per line"
        submitLabel="Save journey steps"
        lines={trackStepLines(track.rows)}
        version={track.version}
        count={track.rows.length}
      />
    </div>
  );
}
