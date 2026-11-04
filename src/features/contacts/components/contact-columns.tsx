"use client";

import { ColumnPicks } from "@/components/shared/column-picks";
import {
  CONTACT_COLUMNS,
  type ContactColumnKey,
  DEFAULT_CONTACT_COLUMNS,
} from "@/domain/contact-list";
import { saveContactView } from "../view-actions";

/** The columns of the contacts list, the person's own; Reset also forgets the widths dragged. */
export function ContactColumns({ shown }: { shown: readonly ContactColumnKey[] }) {
  return (
    <ColumnPicks
      defs={CONTACT_COLUMNS}
      defaults={DEFAULT_CONTACT_COLUMNS}
      shown={shown}
      onChange={(columns) => saveContactView({ columns })}
      onReset={() => saveContactView({ columns: DEFAULT_CONTACT_COLUMNS, widths: {} })}
    />
  );
}
