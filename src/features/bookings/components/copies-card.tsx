import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewTab } from "@/components/shared/new-tab";
import { CopyBlocked } from "./copy-blocked";

/** The printed copies of the booking: the customer's with the price, one per driver without. */
export function CopiesCard({
  bookingId,
  boxes,
  blocked = [],
  fix,
  canSend = false,
}: {
  bookingId: string;
  /** Opens the booking's message form on the copy's template; sending it closes the step. */
  canSend?: boolean;
  /** Each box with what its copy still lacks (domain/loading truckerCopyGaps). */
  boxes: { id: string; number: string | null; gaps: string[] }[];
  /** Why no copy may go out (domain/vessels scheduleConflict); empty when the dates agree. */
  blocked?: string[];
  fix?: React.ReactNode;
}) {
  const base = `/print/bookings/${bookingId}`;
  const link = (href: string, label: string) => (
    <a
      key={href}
      href={href}
      target="_blank"
      rel="noopener"
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      {label}
      <NewTab />
    </a>
  );
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Printed copies</CardTitle>
      </CardHeader>
      {blocked.length > 0 ? (
        <CardContent>
          <CopyBlocked bookingId={bookingId} reasons={blocked} fix={fix} />
        </CardContent>
      ) : (
        <CardContent className="flex flex-wrap gap-2">
          {link(`${base}/customer`, "Customer copy (with price)")}
          {boxes.length > 1
            ? boxes.map((c, i) => (
                <span key={c.id} className="inline-flex flex-wrap items-center gap-1">
                  {link(
                    `${base}/trucker?box=${i + 1}`,
                    `Trucker copy — box ${i + 1}${c.number ? ` ${c.number}` : ""}`,
                  )}
                  {c.gaps.length > 0 && (
                    <span className="text-xs text-warning">missing: {c.gaps.join(", ")}</span>
                  )}
                </span>
              ))
            : link(`${base}/trucker`, "Trucker copy (no price)")}
          {boxes.length === 1 && boxes[0].gaps.length > 0 && (
            <span className="self-center text-xs text-warning">
              missing: {boxes[0].gaps.join(", ")}
            </span>
          )}
          {boxes.length > 1 && link(`${base}/trucker`, `All ${boxes.length} boxes on one sheet`)}
          {canSend && (
            <Link
              href={`/bookings/${bookingId}/messages?tpl=BK_CONFIRM`}
              className={buttonVariants({ size: "sm" })}
            >
              Send the confirmation
            </Link>
          )}
          {/* One message, one trucker, one container (legacy driverCopyOut); a box whose loading
              is not agreed yet gets no copy. */}
          {canSend &&
            boxes.map((c, i) =>
              c.gaps.length ? null : (
                <Link
                  key={`send-${c.id}`}
                  href={`/bookings/${bookingId}/messages?tpl=DRIVER_COPY&box=${i + 1}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  {boxes.length > 1 ? `Send to the trucker — box ${i + 1}` : "Send to the trucker"}
                </Link>
              ),
            )}
        </CardContent>
      )}
    </Card>
  );
}
