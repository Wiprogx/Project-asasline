import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABEL } from "@/domain/permissions";
import { ChangePasswordForm } from "@/features/account/components/change-password-form";
import { requireUser } from "@/server/auth/dal";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader
        title="My account"
        description={`${user.name} · ${user.email} · ${ROLE_LABEL[user.role]}`}
      />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Your other devices are signed out when you change it.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </>
  );
}
