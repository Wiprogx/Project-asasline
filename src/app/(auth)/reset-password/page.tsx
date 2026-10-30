import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetForm } from "@/features/auth/components/password-forms";
import { resetTokenUser } from "@/server/auth/reset-tokens";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const token = (await searchParams).token;
  const who = typeof token === "string" ? await resetTokenUser(token) : null;
  if (!who || typeof token !== "string")
    return (
      <AuthCard
        title="This link no longer works"
        description="It has expired (after an hour) or was already used."
      >
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Ask for a new link
        </Link>
      </AuthCard>
    );
  return (
    <AuthCard title="Choose a new password" description={`For ${who.email}.`}>
      <ResetForm token={token} />
    </AuthCard>
  );
}
