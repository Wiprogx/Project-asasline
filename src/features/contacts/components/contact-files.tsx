"use client";

import { Download, Eye, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { FileViewer, type ViewerFile } from "@/components/shared/viewer/file-viewer";
import { Tool } from "@/components/shared/viewer/viewer-toolbar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { removeContactFile } from "../file-actions";
import type { ContactFile } from "../file-queries";
import { EmailFileDialog } from "./email-file-dialog";

const size = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;

const key = (f: ContactFile) => `${f.where.kind}-${f.id}`;

/** A small icon action of a row, named for screen readers and in a tooltip. */
function RowAction({ label, ...props }: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={label} {...props} />}
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Where({ f, canRemove }: { f: ContactFile; canRemove: boolean }) {
  if (f.where.kind !== "contact")
    return (
      <Link
        className="font-mono text-xs hover:underline"
        href={
          f.where.kind === "booking"
            ? `/bookings/${f.where.id}/documents`
            : `/accounting/invoices/${f.where.id}`
        }
      >
        {f.where.ref}
      </Link>
    );
  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      {f.where.ref}
      {canRemove && (
        <ReasonDialog
          action={removeContactFile}
          hidden={{ contactId: f.where.id, fileId: f.id }}
          trigger="Remove"
          title={`Take ${f.name} off the contact?`}
          description="It stays on the record with your reason."
          confirmLabel="Take it off"
        />
      )}
    </span>
  );
}

/**
 * Every paper on the contact's file, and where it is filed. A name opens the full-screen
 * viewer (the arrows walk the list); each row also downloads and sends by e-mail.
 */
export function ContactFiles({
  rows,
  contactId,
  email,
  canRemove = false,
}: {
  rows: ContactFile[];
  contactId: string;
  email: string | null;
  canRemove?: boolean;
}) {
  const [at, setAt] = useState<number | null>(null);
  if (rows.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nothing kept on this contact, its shipments or its documents yet.
      </p>
    );
  const files: ViewerFile[] = rows.map((f) => ({
    id: key(f),
    name: f.name,
    href: f.href,
    detail: [f.code, f.where.ref, f.on, size(f.sizeBytes)].filter(Boolean).join(" · "),
  }));
  const emailOf = (f: ContactFile, trigger: React.ReactElement) => (
    <EmailFileDialog contactId={contactId} email={email} file={f} trigger={trigger} />
  );
  return (
    <>
      <Table aria-label="Contact files">
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            <TableHead className="hidden md:table-cell">Filed as</TableHead>
            <TableHead>On</TableHead>
            <TableHead className="hidden md:table-cell">Day</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((f, i) => (
            <TableRow key={key(f)}>
              <TableCell>
                <button
                  type="button"
                  className="text-left font-medium hover:underline"
                  onClick={() => setAt(i)}
                >
                  {f.name}
                </button>
                <span className="text-muted-foreground"> · {size(f.sizeBytes)}</span>
              </TableCell>
              <TableCell className="hidden font-mono text-xs md:table-cell">
                {f.code ?? "—"}
              </TableCell>
              <TableCell>
                <Where f={f} canRemove={canRemove} />
              </TableCell>
              <TableCell className="hidden font-mono text-xs md:table-cell">{f.on}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-0.5">
                  <RowAction label={`Preview ${f.name}`} onClick={() => setAt(i)}>
                    <Eye />
                  </RowAction>
                  <RowAction
                    label={`Download ${f.name}`}
                    render={<a href={f.href} download={f.name} />}
                    nativeButton={false}
                  >
                    <Download />
                  </RowAction>
                  {emailOf(
                    f,
                    <Button variant="ghost" size="icon-sm" aria-label={`Send ${f.name} by e-mail`}>
                      <Mail />
                    </Button>,
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <FileViewer
        files={files}
        at={at}
        onAt={setAt}
        actions={(v) => {
          const f = rows.find((r) => key(r) === v.id);
          return f
            ? emailOf(
                f,
                <Tool label="Send by e-mail">
                  <Mail />
                </Tool>,
              )
            : null;
        }}
      />
    </>
  );
}
