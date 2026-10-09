import Link from "next/link";

/**
 * Nothing may leave the office carrying a sailing the ship has moved past (legacy
 * scheduleConflict): in place of the copy, what disagrees and where to fix it.
 */
export function CopyBlocked({
  bookingId,
  reasons,
  fix,
}: {
  bookingId: string;
  reasons: string[];
  /** The one-click way back to the sailing's dates, when the booking is on one. */
  fix?: React.ReactNode;
}) {
  return (
    <div role="alert" className="grid gap-2 rounded-md border border-destructive/40 p-3 text-sm">
      <p className="font-medium text-destructive">
        {"The dates on this page are not the sailing's"}
      </p>
      <p className="text-muted-foreground">
        {reasons.join(" · ")}.{" "}
        {
          "Somebody typed a date over the schedule. Take the sailing's dates back, or correct the sailing in the register, before a copy goes out."
        }
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {fix}
        <Link className="text-sm underline" href={`/bookings/${bookingId}/edit`}>
          Open ETD / ETA
        </Link>
      </div>
    </div>
  );
}
