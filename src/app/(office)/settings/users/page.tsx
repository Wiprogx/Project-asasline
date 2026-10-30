import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddUserDialog } from "@/features/users/components/user-dialogs";
import { UsersTable } from "@/features/users/components/users-table";
import { listUsers } from "@/features/users/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const user = await requirePagePermission("app.settings");
  const rows = await listUsers();
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle>Users ({rows.filter((u) => u.active).length} active)</CardTitle>
          <CardDescription>
            Users are switched off, never deleted — their name stays on everything they did.
          </CardDescription>
        </div>
        <AddUserDialog />
      </CardHeader>
      <CardContent>
        <UsersTable rows={rows} selfId={user.id} />
      </CardContent>
    </Card>
  );
}
