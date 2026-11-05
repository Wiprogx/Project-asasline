"use client";

import { ColumnPicks } from "@/components/shared/column-picks";
import {
  BOOKING_COLUMNS,
  type BookingColumnKey,
  DEFAULT_BOOKING_COLUMNS,
} from "@/domain/booking-list";
import { saveBookingView } from "../view-actions";

/** The columns of the bookings list, the person's own; Reset also forgets the widths dragged. */
export function BookingColumns({ shown }: { shown: readonly BookingColumnKey[] }) {
  return (
    <ColumnPicks
      defs={BOOKING_COLUMNS}
      defaults={DEFAULT_BOOKING_COLUMNS}
      shown={shown}
      onChange={(columns) => saveBookingView({ columns })}
      onReset={() => saveBookingView({ columns: DEFAULT_BOOKING_COLUMNS, widths: {} })}
    />
  );
}
