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
}: {
  bookingId: string;
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
        </CardContent>
      )}
    </Card>
  );
}
