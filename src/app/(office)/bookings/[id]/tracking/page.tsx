import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { may } from "@/domain/permissions";
import { isPaperDoc, startTrack } from "@/domain/release";
import { OriginalsCard } from "@/features/bookings/components/originals-card";
import { ReleaseCard } from "@/features/bookings/components/release-card";
import { TrackingSteps } from "@/features/bookings/components/tracking-steps";
import { getBooking } from "@/features/bookings/queries";
import { contactOptions } from "@/features/contacts/queries";
import { requirePagePermission } from "@/server/auth/dal";
import { readConfig } from "@/server/config-tables";
import { readReleaseStates, readSendModes, readTrackSteps } from "@/server/release-config";

export const metadata: Metadata = { title: "Tracking" };

/** Release, the originals and the journey's milestones (legacy Tracking tab). */
export default async function TrackingPage({ params }: PageProps<"/bookings/[id]/tracking">) {
  const user = await requirePagePermission("app.bookings");
  const { id } = await params;
  const [b, states, modes, steps, paperDocs, contacts] = await Promise.all([
    getBooking(id),
    readReleaseStates(),
    readSendModes(),
    readTrackSteps(),
    readConfig("paperDocs"),
    contactOptions(),
  ]);
  if (!b) notFound();
  const canEdit = may(user, "bookings.edit") && b.status !== "cancelled";
  const track = b.track.length ? b.track : startTrack(steps);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ReleaseCard
        id={b.id}
        version={b.version}
        release={b.release}
        releaseById={b.releaseById}
        releaseNote={b.releaseNote}
        states={states}
        contacts={contacts}
        canEdit={canEdit}
      />
      <OriginalsCard
        id={b.id}
        version={b.version}
        docType={b.docType}
        paper={isPaperDoc(paperDocs, b.docType)}
        docReceiverId={b.docReceiverId}
        sendMode={b.sendMode}
        sendDate={b.sendDate}
        sendTracking={b.sendTracking}
        modes={modes}
        contacts={contacts}
        canEdit={canEdit}
      />
      <TrackingSteps
        id={b.id}
        version={b.version}
        track={track}
        boxes={b.containers
          .filter((c) => c.number)
          .map((c) => ({ id: c.id, number: c.number, seals: c.seals.length }))}
        canEdit={canEdit}
      />
    </div>
  );
}
