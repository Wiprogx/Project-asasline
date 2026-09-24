import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { missingCount } from "@/domain/files";
import { can } from "@/domain/permissions";
import { BookingFiles } from "@/features/bookings/components/booking-files";
import { DocumentChain } from "@/features/bookings/components/document-chain";
import { FileUploadForm } from "@/features/bookings/components/file-upload-form";
import { RequirementsList } from "@/features/bookings/components/requirements-list";
import { bookingDocuments } from "@/features/bookings/file-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Documents" };

/** The papers of the shipment: what it lacks, the steps that produce them, and what is filed. */
export default async function BookingDocumentsPage({
  params,
}: PageProps<"/bookings/[id]/documents">) {
  const user = await requirePagePermission("app.bookings");
  const d = await bookingDocuments((await params).id);
  if (!d) notFound();
  const canEdit = can(user.role, "documents.upload") && d.booking.status !== "cancelled";
  const missing = missingCount(d.requirements);
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">
            Required papers{missing > 0 && ` · ${missing} missing`}
          </h2>
        </CardHeader>
        <CardContent>
          <RequirementsList reqs={d.requirements} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">Files ({d.files.length})</h2>
        </CardHeader>
        <CardContent className="grid gap-3">
          <BookingFiles
            bookingId={d.booking.id}
            files={d.files}
            codes={d.codes}
            steps={d.openSteps}
            canEdit={canEdit}
          />
          {canEdit && (
            <FileUploadForm bookingId={d.booking.id} codes={d.codes} steps={d.openSteps} />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">Document steps</h2>
        </CardHeader>
        <CardContent>
          <DocumentChain steps={d.steps} today={officeToday()} />
        </CardContent>
      </Card>
    </div>
  );
}
