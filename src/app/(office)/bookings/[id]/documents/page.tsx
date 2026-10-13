import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { missingCount } from "@/domain/files";
import { may } from "@/domain/permissions";
import { kindOfPaper, onSide, parseSide, type RuleKind, type Side } from "@/domain/sides";
import { BookingFiles } from "@/features/bookings/components/booking-files";
import { DocumentChain } from "@/features/bookings/components/document-chain";
import { FileUploadForm } from "@/features/bookings/components/file-upload-form";
import { RequirementsList } from "@/features/bookings/components/requirements-list";
import { SideTabs } from "@/features/bookings/components/side-tabs";
import { bookingDocuments } from "@/features/bookings/file-queries";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export const metadata: Metadata = { title: "Documents" };

/**
 * The papers of the shipment: what it lacks, the steps that produce them, and what is filed.
 * A shipment both ways shows one side at a time (legacy EXPORT Doc. / IMPORT Doc. tabs).
 */
export default async function BookingDocumentsPage({
  params,
  searchParams,
}: PageProps<"/bookings/[id]/documents">) {
  const user = await requirePagePermission("app.bookings");
  const d = await bookingDocuments((await params).id);
  if (!d) notFound();
  const canEdit = may(user, "documents.upload") && d.booking.status !== "cancelled";
  const both = d.booking.kind === "both";
  const side = parseSide((await searchParams).side);
  const kinds: Record<string, RuleKind> = Object.fromEntries(
    d.steps.map((s) => [s.rule.code, s.rule.kind]),
  );
  const papersOf = (s: Side) => d.requirements.filter((r) => onSide(kindOfPaper(r, kinds), s));
  const reqs = both ? papersOf(side) : d.requirements;
  const steps = both ? d.steps.filter((s) => onSide(s.rule.kind, side)) : d.steps;
  const missing = missingCount(reqs);
  return (
    <div className="grid gap-4">
      {both && (
        <SideTabs
          base={`/bookings/${d.booking.id}/documents`}
          side={side}
          missing={{
            export: missingCount(papersOf("export")),
            import: missingCount(papersOf("import")),
          }}
        />
      )}
      <Card>
        <CardHeader>
          <h2 className="font-heading text-base font-medium">
            {both ? (side === "export" ? "Export papers" : "Import papers") : "Required papers"}
            {missing > 0 && ` · ${missing} missing`}
          </h2>
        </CardHeader>
        <CardContent>
          <RequirementsList
            reqs={reqs}
            bookingId={d.booking.id}
            canEdit={canEdit}
            reviewed={d.reviewed}
            checklists={d.checklists}
          />
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
          <DocumentChain steps={steps} today={officeToday()} />
        </CardContent>
      </Card>
    </div>
  );
}
