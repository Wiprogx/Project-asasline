"use client";

import Link from "next/link";
import { ActionForm } from "@/components/shared/action-form";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { SortableHead } from "@/components/shared/sortable-head";
import { TableToolbar } from "@/components/shared/table-toolbar";
import { ToneBadge } from "@/components/shared/tone-badge";
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
import { useToastedAction } from "@/hooks/use-action-toast";
import { useTableView } from "@/hooks/use-table-view";
import type { TableSpec } from "@/lib/table-view";
import { switchOff, switchOn } from "../actions";
import type { UserRow } from "../queries";
import { PasswordDialog } from "./password-dialog";
import { EditUserDialog } from "./user-dialogs";

const statusOf = (u: UserRow) =>
  !u.active ? "off" : u.mustChangePassword ? "temporary" : "active";

const SPEC: TableSpec<UserRow> = {
  search: (u) => [u.name, u.email, ROLE_LABEL[u.role], u.jobTitle],
  filters: [
    {
      key: "role",
      label: "Role",
      options: ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
      test: (u, v) => u.role === v,
    },
    {
      key: "status",
      label: "Status",
      options: [
        { value: "active", label: "Active" },
        { value: "temporary", label: "Temporary password" },
        { value: "off", label: "Switched off" },
      ],
      test: (u, v) => statusOf(u) === v,
    },
  ],
  sorts: {
    name: (u) => u.name,
    email: (u) => u.email,
    role: (u) => ROLE_LABEL[u.role],
    status: statusOf,
    signin: (u) => u.lastSignIn,
  },
};

function Status({ u }: { u: UserRow }) {
  if (!u.active)
    return (
      <span className="grid gap-0.5">
        <ToneBadge tone="neutral">Switched off</ToneBadge>
        {u.offReason && <span className="text-xs text-muted-foreground">{u.offReason}</span>}
      </span>
    );
  if (u.mustChangePassword) return <ToneBadge tone="warning">Temporary password</ToneBadge>;
  return <ToneBadge tone="success">Active</ToneBadge>;
}

function SwitchOnButton({ id }: { id: string }) {
  const [, run, pending] = useToastedAction(switchOn);
  return (
    <ActionForm action={run}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Switch on
      </Button>
    </ActionForm>
  );
}

function Actions({ u, isSelf }: { u: UserRow; isSelf: boolean }) {
  return (
    <span className="flex flex-wrap justify-end gap-2">
      {u.active && <EditUserDialog user={u} isSelf={isSelf} />}
      {u.active && <PasswordDialog id={u.id} name={u.name} email={u.email} />}
      {u.active && !isSelf && (
        <ReasonDialog
          action={switchOff}
          hidden={{ id: u.id }}
          trigger="Switch off"
          title={`Switch off ${u.name}?`}
          description="They are signed out at once and can no longer sign in. Nothing is deleted: their name stays on everything they did, and they can be switched back on."
          confirmLabel="Switch off"
        />
      )}
      {!u.active && <SwitchOnButton id={u.id} />}
    </span>
  );
}

/** The office's users, searched by name, email, role or job title; one row each with its actions. */
export function UsersTable({ rows, selfId }: { rows: UserRow[]; selfId: string }) {
  const view = useTableView(rows, SPEC);
  const shown = view.rows;
  const head = { state: view.state, onSort: view.toggleSort };
  return (
    <div className="grid gap-3">
      <TableToolbar
        view={view}
        filters={SPEC.filters}
        searchLabel="Search a name, email, role…"
        noun="users"
      />
      <Table aria-label="Users">
        <TableHeader>
          <TableRow>
            <SortableHead sortKey="name" {...head}>
              Name
            </SortableHead>
            <SortableHead sortKey="email" className="hidden md:table-cell" {...head}>
              Email
            </SortableHead>
            <SortableHead sortKey="role" {...head}>
              Role
            </SortableHead>
            <SortableHead sortKey="status" {...head}>
              Status
            </SortableHead>
            <SortableHead sortKey="signin" className="hidden lg:table-cell" {...head}>
              Last sign-in
            </SortableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((u) => (
            <TableRow key={u.id} className={u.active ? undefined : "text-muted-foreground"}>
              <TableCell className="align-top">
                <span className="font-medium">{u.name}</span>
                {u.id === selfId && <span className="text-muted-foreground"> (you)</span>}
                {u.jobTitle && (
                  <span className="block text-xs text-muted-foreground">{u.jobTitle}</span>
                )}
                <Link
                  href={`/settings/users/${u.id}/log`}
                  className="block text-xs text-muted-foreground hover:underline"
                >
                  What they did ›
                </Link>
              </TableCell>
              <TableCell className="hidden align-top md:table-cell">{u.email}</TableCell>
              <TableCell className="align-top">{ROLE_LABEL[u.role]}</TableCell>
              <TableCell className="align-top">
                <Status u={u} />
              </TableCell>
              <TableCell className="hidden align-top font-mono text-xs lg:table-cell">
                {u.lastSignIn ?? "never"}
              </TableCell>
              <TableCell className="align-top">
                <Actions u={u} isSelf={u.id === selfId} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {shown.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">No user matches.</p>
      )}
    </div>
  );
}
