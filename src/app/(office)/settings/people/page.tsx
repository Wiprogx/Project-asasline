import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddPersonForm } from "@/features/people/components/add-person-form";
import { PeopleTable } from "@/features/people/components/people-table";
import { listPeople } from "@/features/people/queries";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage() {
  const user = await requirePagePermission("app.settings");
  const people = await listPeople();
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Add a person</CardTitle>
          <CardDescription>
            They sign in with this email; ask them to change the password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddPersonForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Staff ({people.filter((p) => p.active).length} active)</CardTitle>
          <CardDescription>
            People are switched off, never deleted — their name stays on everything they did.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PeopleTable rows={people} selfId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
