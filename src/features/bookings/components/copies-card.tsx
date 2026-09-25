import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** The printed copies of the booking: the customer's with the price, one per driver without. */
export function CopiesCard({
  bookingId,
  boxes,
}: {
  bookingId: string;
  boxes: { id: string; number: string | null }[];
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
    </a>
  );
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Printed copies</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {link(`${base}/customer`, "Customer copy (with price)")}
        {boxes.length > 1
          ? boxes.map((c, i) =>
              link(
                `${base}/trucker?box=${i + 1}`,
                `Trucker copy — box ${i + 1}${c.number ? ` ${c.number}` : ""}`,
              ),
            )
          : link(`${base}/trucker`, "Trucker copy (no price)")}
        {boxes.length > 1 && link(`${base}/trucker`, `All ${boxes.length} boxes on one sheet`)}
      </CardContent>
    </Card>
  );
}
