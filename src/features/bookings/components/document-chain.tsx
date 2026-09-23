import { ToneBadge } from "@/components/shared/tone-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ANCHOR_LABEL } from "@/domain/rules/engine";
import type { PlanStep } from "@/domain/rules/plan";
import type { Tone } from "@/domain/shipments";
import { bucketOf } from "@/domain/tasks";

const PARTY_LABEL: Record<string, string> = {
  customer: "Customer",
  payer: "Payer",
  consignee: "Consignee's forwarder",
  customs: "Customs agent",
  carrier: "Shipping line",
  waiver: "Waiver office",
  internal: "Us",
};

function anchorText(s: PlanStep) {
  const { anchor, offset, workingDays } = s.rule;
  if (!offset) return ANCHOR_LABEL[anchor];
  const n = Math.abs(offset);
  return `${ANCHOR_LABEL[anchor]} ${offset > 0 ? "+" : "−"} ${n}${workingDays ? " working" : ""} day${n === 1 ? "" : "s"}`;
}

function Status({ s, today }: { s: PlanStep; today: string }) {
  if (s.status === "done") return <ToneBadge tone="success">Done</ToneBadge>;
  if (s.status === "waiting")
    return <ToneBadge tone="neutral">Waits on {s.waitingOn.join(", ")}</ToneBadge>;
  const b = bucketOf(s.due?.day ?? null, today);
  const tone: Tone = b === "overdue" ? "danger" : b === "today" ? "warning" : "info";
  return <ToneBadge tone={tone}>Open</ToneBadge>;
}

/**
 * The document chain (legacy requirements view): every paper this booking needs, why it is
 * due when it is ("Customs closing − 2 days", "moved: Saturday"), and what it waits on.
 */
export function DocumentChain({ steps, today }: { steps: PlanStep[]; today: string }) {
  if (steps.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No document rule applies yet — set the ports (UN/LOCODE) and the direction on the Edit tab.
      </p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Step</TableHead>
          <TableHead className="hidden md:table-cell">Owed by</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>State</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {steps.map((s) => (
          <TableRow key={s.rule.code}>
            <TableCell className="max-w-md whitespace-normal">
              <span className="font-medium">
                {s.rule.blocking && <span title="Stops the shipment if missed">⛔ </span>}
                {s.title.replace(/ — [^—]+$/, "")}
              </span>
              <span className="block font-mono text-xs text-muted-foreground">{s.rule.code}</span>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {PARTY_LABEL[s.rule.party] ?? s.rule.party}
            </TableCell>
            <TableCell className="whitespace-normal">
              <span className="font-mono text-xs">{s.due?.day ?? "no date yet"}</span>
              <span className="block text-xs text-muted-foreground">
                {anchorText(s)}
                {s.due?.movedBecause && ` · moved: ${s.due.movedBecause}`}
              </span>
            </TableCell>
            <TableCell>
              <Status s={s} today={today} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
