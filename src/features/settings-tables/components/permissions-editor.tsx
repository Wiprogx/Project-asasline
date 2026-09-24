"use client";

import { ActionForm } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Permission, type PermissionMatrix, ROLE_LABEL, ROLES } from "@/domain/permissions";
import { useToastedAction } from "@/hooks/use-action-toast";
import { savePermissions } from "../actions";

/** The roles' permissions (legacy perms): a checkbox per cell; the Admin keeps Settings. */
export function PermissionsEditor({
  matrix,
  version,
}: {
  matrix: PermissionMatrix;
  version: number;
}) {
  const [state, run, pending] = useToastedAction(savePermissions);
  const permissions = Object.keys(matrix) as Permission[];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles &amp; permissions</CardTitle>
        <CardDescription>
          Everything follows the role behind the person: an app a role cannot open leaves its bar,
          and a role without &quot;bookings.edit&quot; loses every edit on a booking. Rules and
          routing name roles, never people.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={run} className="grid gap-3">
          <input type="hidden" name="version" value={version} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                {ROLES.map((r) => (
                  <TableHead key={r} className="text-center">
                    {ROLE_LABEL[r]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissions.map((p) => (
                <TableRow key={p}>
                  <TableCell className="font-mono text-xs">{p}</TableCell>
                  {ROLES.map((r, i) => {
                    const locked = p === "app.settings" && r === "admin";
                    return (
                      <TableCell key={r} className="text-center">
                        <input
                          type="checkbox"
                          name={`${p}:${i}`}
                          aria-label={`${ROLE_LABEL[r]} — ${p}`}
                          defaultChecked={matrix[p][i] === 1}
                          disabled={locked}
                          className="size-4 accent-primary"
                        />
                        {locked && <input type="hidden" name={`${p}:${i}`} value="on" />}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!state.ok && state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {version === 0 ? "built-in defaults, not yet saved" : `version ${version}`} · applies
              at the next page load
            </span>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save permissions"}
            </Button>
          </div>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
