import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/features/auth/components/auth-card";
import { OwnPasswordForm } from "@/features/auth/components/password-forms";
import { requireUser } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Choose your password" };

/** After a temporary password: the person chooses their own before anything else opens. */
export default async function ChangePasswordPage() {
  const user = await requireUser();
  if (!user.mustChangePassword) redirect("/");
  return (
    <AuthCard
      title="Choose your password"
      description={`${user.name}, you signed in with a temporary password. Choose your own to continue.`}
    >
      <OwnPasswordForm />
    </AuthCard>
  );
}
