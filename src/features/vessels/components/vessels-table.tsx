import Link from "next/link";
import { ToneBadge } from "@/components/shared/tone-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VESSEL_STATUS_META } from "@/domain/vessels";
import type { listVessels } from "../queries";

type Row = Awaited<ReturnType<typeof listVessels>>[number];

export function VesselsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0)
    return <p className="py-8 text-center text-sm text-muted-foreground">No sailing yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vessel · voyage</TableHead>
          <TableHead>Carrier</TableHead>
          <TableHead>Route</TableHead>
          <TableHead>ETD</TableHead>
          <TableHead>ETA</TableHead>
          <TableHead>State</TableHead>
          <TableHead className="text-right">Bookings</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ vessel: v, bookings }) => (
          <TableRow key={v.id}>
            <TableCell>
              <Link className="font-medium hover:underline" href={`/settings/vessels/${v.id}`}>
                {v.name} · {v.voyage}
              </Link>
            </TableCell>
            <TableCell>{v.carrier ?? "—"}</TableCell>
            <TableCell className="font-mono text-xs">
              {v.pol ?? "?"} › {v.pod ?? "?"}
            </TableCell>
            <TableCell className="font-mono text-xs">{v.etd ?? "—"}</TableCell>
            <TableCell className="font-mono text-xs">{v.eta ?? "—"}</TableCell>
            <TableCell>
              <ToneBadge tone={VESSEL_STATUS_META[v.status].tone}>
                {VESSEL_STATUS_META[v.status].label}
              </ToneBadge>
            </TableCell>
            <TableCell className="text-right tabular-nums">{bookings}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
