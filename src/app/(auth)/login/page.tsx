import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentUser } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");
  const reset = (await searchParams).reset === "1";
  return (
    <AuthCard title="ASASLINE TMS" description="Sign in with your office account.">
      {reset && (
        <p role="status" className="mb-4 rounded-md bg-muted p-2 text-sm">
          Your new password is saved. Sign in with it.
        </p>
      )}
      <LoginForm />
      <Link
        href="/forgot-password"
        className="mt-4 block text-center text-sm text-muted-foreground hover:underline"
      >
        Forgot your password?
      </Link>
    </AuthCard>
  );
}
