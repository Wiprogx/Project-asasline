"use client";

import { ColumnPicks } from "@/components/shared/column-picks";
import {
  DEFAULT_QUOTATION_COLUMNS,
  QUOTATION_COLUMNS,
  type QuotationColumnKey,
} from "@/domain/quotation-list";
import { saveQuotationView } from "../view-actions";

/** The columns of the quotations list, the person's own; Reset also forgets the widths dragged. */
export function QuotationColumns({ shown }: { shown: readonly QuotationColumnKey[] }) {
  return (
    <ColumnPicks
      defs={QUOTATION_COLUMNS}
      defaults={DEFAULT_QUOTATION_COLUMNS}
      shown={shown}
      onChange={(columns) => saveQuotationView({ columns })}
      onReset={() => saveQuotationView({ columns: DEFAULT_QUOTATION_COLUMNS, widths: {} })}
    />
  );
}
