"use client";

import { Field } from "@/components/shared/field";
import { FormDialog } from "@/components/shared/form-dialog";
import { NativeSelect } from "@/components/shared/native-select";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { ToneBadge } from "@/components/shared/tone-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { archiveFile, refileFile } from "../file-actions";

type FileRow = {
  id: string;
  name: string;
  sizeBytes: number;
  code: string | null;
  stage: string;
  ruleCode: string | null;
  by: string;
  createdAt: Date;
};

const size = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;

/** The files on the booking: open each, change what it is filed as, take it off with a reason. */
export function BookingFiles({
  bookingId,
  files,
  codes,
  steps,
  canEdit,
}: {
  bookingId: string;
  files: FileRow[];
  codes: string[];
  steps: { code: string; doc: string }[];
  canEdit: boolean;
}) {
  if (files.length === 0)
    return <p className="text-sm text-muted-foreground">Nothing filed yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead>Filed as</TableHead>
          <TableHead>Step</TableHead>
          <TableHead>By</TableHead>
          {canEdit && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((f) => (
          <TableRow key={f.id}>
            <TableCell>
              <a
                className="font-medium hover:underline"
                href={`/api/bookings/${bookingId}/files/${f.id}`}
                target="_blank"
                rel="noopener"
              >
                {f.name}
              </a>
              <span className="text-muted-foreground"> · {size(f.sizeBytes)}</span>
            </TableCell>
            <TableCell>
              {f.code ? <span className="font-mono text-xs">{f.code}</span> : "—"}{" "}
              <ToneBadge tone={f.stage === "final" ? "success" : "warning"}>
                {f.stage === "final" ? "Final" : "Draft"}
              </ToneBadge>
            </TableCell>
            <TableCell className="font-mono text-xs">{f.ruleCode ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">
              {f.by} · {new Date(f.createdAt).toISOString().slice(0, 10)}
            </TableCell>
            {canEdit && (
              <TableCell>
                <div className="flex justify-end gap-2">
                  <FormDialog
                    action={refileFile}
                    hidden={{ bookingId, fileId: f.id }}
                    trigger="Refile"
                    title={f.name}
                    submitLabel="Save"
                  >
                    {(fe) => (
                      <>
                        <Field id={`rf-code-${f.id}`} label="Filed as" error={fe?.code}>
                          <NativeSelect
                            id={`rf-code-${f.id}`}
                            name="code"
                            defaultValue={f.code ?? ""}
                            placeholder="— no code —"
                            options={codes.map((c) => ({ value: c, label: c }))}
                          />
                        </Field>
                        <Field id={`rf-stage-${f.id}`} label="Stage" error={fe?.stage}>
                          <NativeSelect
                            id={`rf-stage-${f.id}`}
                            name="stage"
                            defaultValue={f.stage}
                            options={[
                              { value: "final", label: "Final" },
                              { value: "draft", label: "Draft" },
                            ]}
                          />
                        </Field>
                        <Field id={`rf-step-${f.id}`} label="Proves the step" error={fe?.ruleCode}>
                          <NativeSelect
                            id={`rf-step-${f.id}`}
                            name="ruleCode"
                            defaultValue={f.ruleCode ?? ""}
                            placeholder="— none —"
                            options={steps.map((s) => ({
                              value: s.code,
                              label: `${s.code} · ${s.doc}`,
                            }))}
                          />
                        </Field>
                      </>
                    )}
                  </FormDialog>
                  <ReasonDialog
                    action={archiveFile}
                    hidden={{ bookingId, fileId: f.id }}
                    trigger="Take off"
                    title={`Take "${f.name}" off the booking?`}
                    description="It leaves the list; the file and your reason stay on the record."
                    confirmLabel="Take off"
                  />
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
