"use client";

import { ActionForm } from "@/components/shared/action-form";
import { SortableHead } from "@/components/shared/sortable-head";
import { TableToolbar } from "@/components/shared/table-toolbar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABEL, ROLES } from "@/domain/permissions";
import { ANCHOR_LABEL, type DocRule } from "@/domain/rules/engine";
import { useToastedAction } from "@/hooks/use-action-toast";
import { useTableView } from "@/hooks/use-table-view";
import type { TableSpec } from "@/lib/table-view";
import { cn } from "@/lib/utils";
import { toggleRule } from "../actions";
import { RuleDialog } from "./rule-dialog";
import { toggleRuleSchema } from "../schemas";

function Toggle({ index, version, active }: { index: number; version: number; active: boolean }) {
  const [, run, pending] = useToastedAction(toggleRule, undefined, toggleRuleSchema);
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

/** A rule with its place in the book: the actions name it by that place, whatever the order shown. */
type Line = { r: DocRule; i: number };

const SPEC: TableSpec<Line> = {
  search: ({ r }) => [r.step, r.code, r.country, r.pol, ROLE_LABEL[r.role], r.needs.join(" ")],
  filters: [
    {
      key: "state",
      label: "State",
      options: [
        { value: "on", label: "On" },
        { value: "off", label: "Switched off" },
      ],
      test: ({ r }, v) => r.active === (v === "on"),
    },
    {
      key: "role",
      label: "Chased by",
      options: ROLES.map((x) => ({ value: x, label: ROLE_LABEL[x] })),
      test: ({ r }, v) => r.role === v,
    },
    {
      key: "blocking",
      label: "Blocking",
      options: [
        { value: "yes", label: "Blocks" },
        { value: "no", label: "Does not block" },
      ],
      test: ({ r }, v) => r.blocking === (v === "yes"),
    },
  ],
  sorts: {
    rule: ({ r }) => r.step,
    applies: ({ r }) => (r.country === "*" ? "" : r.country),
    due: ({ r }) => `${ANCHOR_LABEL[r.anchor]} ${String(r.offset + 1000).padStart(5, "0")}`,
  },
};

/** The rule book: which paper, for which route, due when, after what, chased by whom. */
export function RulesTable({ rules, version }: { rules: DocRule[]; version: number }) {
  const view = useTableView(
    rules.map((r, i) => ({ r, i })),
    SPEC,
  );
  const head = { state: view.state, onSort: view.toggleSort };
  return (
    <div className="grid gap-3">
      <TableToolbar
        view={view}
        filters={SPEC.filters}
        searchLabel="Search a step, code, country or port"
        noun="rules"
      />
      <Table aria-label="Rules">
        <TableHeader>
          <TableRow>
            <SortableHead sortKey="rule" {...head}>
              Rule
            </SortableHead>
            <SortableHead sortKey="applies" {...head}>
              Applies to
            </SortableHead>
            <SortableHead sortKey="due" className="hidden md:table-cell" {...head}>
              Due
            </SortableHead>
            <TableHead className="hidden lg:table-cell">Needs</TableHead>
            <TableHead className="text-right">Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.map(({ r, i }) => (
            <TableRow
              key={`${r.code}-${r.pol}-${i}`}
              className={cn(!r.active && "text-muted-foreground")}
            >
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
    </div>
  );
}
