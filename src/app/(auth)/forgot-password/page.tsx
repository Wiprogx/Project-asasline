import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ForgotForm } from "@/features/auth/components/password-forms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot your password?"
      description="Give the email you sign in with; a link to choose a new password follows."
    >
      <ForgotForm />
    </AuthCard>
  );
}
