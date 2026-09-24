"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABEL } from "@/domain/permissions";
import { ANCHOR_LABEL, type DocRule } from "@/domain/rules/engine";
import { useToastedAction } from "@/hooks/use-action-toast";
import { cn } from "@/lib/utils";
import { toggleRule } from "../actions";
import { RuleDialog } from "./rule-dialog";

function Toggle({ index, version, active }: { index: number; version: number; active: boolean }) {
  const [, run, pending] = useToastedAction(toggleRule);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="index" value={index} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="active" value={String(!active)} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {active ? "Switch off" : "Switch on"}
      </Button>
    </ActionForm>
  );
}

const offsetText = (r: DocRule) =>
  r.offset === 0
    ? ""
    : ` ${r.offset > 0 ? "+" : "−"} ${Math.abs(r.offset)}${r.workingDays ? " wd" : " d"}`;

/** The rule book: which paper, for which route, due when, after what, chased by whom. */
export function RulesTable({ rules, version }: { rules: DocRule[]; version: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rule</TableHead>
          <TableHead>Applies to</TableHead>
          <TableHead className="hidden md:table-cell">Due</TableHead>
          <TableHead className="hidden lg:table-cell">Needs</TableHead>
          <TableHead className="text-right">Change</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((r, i) => (
          <TableRow key={`${r.code}-${r.pol}-${i}`} className={cn(!r.active && "opacity-50")}>
            <TableCell className="max-w-sm whitespace-normal">
              <span className="font-medium">
                {r.blocking && "⛔ "}
                {r.step}
              </span>
              <span className="block font-mono text-xs text-muted-foreground">
                {r.code} · {ROLE_LABEL[r.role]}
                {r.perBox && " · per container"}
              </span>
            </TableCell>
            <TableCell className="font-mono text-xs">
              {r.country === "*" ? "all countries" : r.country}
              {r.pol !== "*" && ` · from ${r.pol}`}
              <span className="block">{r.kind === "*" ? "both ways" : r.kind}</span>
            </TableCell>
            <TableCell className="hidden text-xs md:table-cell">
              {ANCHOR_LABEL[r.anchor]}
              {offsetText(r)}
            </TableCell>
            <TableCell className="hidden font-mono text-xs lg:table-cell">
              {r.needs.join(", ") || "—"}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                <RuleDialog rule={r} index={i} version={version} trigger="Edit" />
                <Toggle index={i} version={version} active={r.active} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
