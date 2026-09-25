import { ToneBadge } from "@/components/shared/tone-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABEL } from "@/domain/permissions";
import type { PersonRow } from "../queries";
import { PersonControls } from "./person-controls";

export function PeopleTable({ rows, selfId }: { rows: PersonRow[]; selfId: string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="hidden md:table-cell">Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id} className={p.active ? undefined : "text-muted-foreground"}>
            <TableCell className="font-medium">
              {p.name}
              {p.id === selfId && <span className="text-muted-foreground"> (you)</span>}
            </TableCell>
            <TableCell className="hidden md:table-cell">{p.email}</TableCell>
            <TableCell>
              {p.active ? ROLE_LABEL[p.role] : <ToneBadge tone="neutral">Switched off</ToneBadge>}
            </TableCell>
            <TableCell>
              <PersonControls id={p.id} role={p.role} active={p.active} isSelf={p.id === selfId} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
