"use client";

import { useRef } from "react";
import { ActionForm } from "@/components/shared/action-form";
import { Field } from "@/components/shared/field";
import { NewTab } from "@/components/shared/new-tab";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ALLOWED_TYPES } from "@/domain/files";
import { useToastedAction } from "@/hooks/use-action-toast";
import { attachInvoiceFile, removeInvoiceFile } from "../file-actions";
import { invoiceFileSchema } from "../schemas";

type FileRow = {
  id: string;
  name: string;
  sizeBytes: number;
  note: string | null;
  by: string | null;
  on: string;
};

const size = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;

/** What is kept with the document (legacy attachments): open each, add one, take one off with a reason. */
export function InvoiceFiles({
  invoiceId,
  files,
  canEdit,
}: {
  invoiceId: string;
  files: FileRow[];
  canEdit: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [, run, pending] = useToastedAction(
    attachInvoiceFile,
    () => form.current?.reset(),
    invoiceFileSchema,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attachments ({files.length})</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing kept with this document yet.</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <a
                    className="font-medium hover:underline"
                    href={`/api/invoices/${invoiceId}/files/${f.id}`}
                    target="_blank"
                    rel="noopener"
                  >
                    {f.name}
                    <NewTab />
                  </a>
                  <span className="text-muted-foreground">
                    {" "}
                    · {size(f.sizeBytes)} · {f.by ?? "—"} · {f.on}
                    {f.note && ` · ${f.note}`}
                  </span>
                </span>
                {canEdit && (
                  <ReasonDialog
                    action={removeInvoiceFile}
                    hidden={{ invoiceId, fileId: f.id }}
                    trigger="Take off"
                    title={`Take ${f.name} off?`}
                    description="It leaves the document but stays on the record."
                    confirmLabel="Take off"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && (
          <ActionForm
            ref={form}
            action={run}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <Field id="if-file" label="File">
              <Input
                id="if-file"
                name="file"
                type="file"
                required
                accept={Object.keys(ALLOWED_TYPES).join(",")}
              />
            </Field>
            <Field id="if-note" label="Note">
              <Input id="if-note" name="note" placeholder="The supplier's PDF, a proof…" />
            </Field>
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              {pending ? "Attaching…" : "Attach"}
            </Button>
          </ActionForm>
        )}
      </CardContent>
    </Card>
  );
}
