import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOOKUP_KINDS, type LookupKind } from "@/domain/lookup-tables";
import { LookupEditor } from "@/features/lookups/components/lookup-editor";
import { LOOKUP_META } from "@/features/lookups/meta";
import { lookupsForEdit } from "@/features/lookups/queries";
import { requirePagePermission } from "@/server/auth/dal";

const isKind = (k: string): k is LookupKind => (LOOKUP_KINDS as readonly string[]).includes(k);

export async function generateMetadata({
  params,
}: PageProps<"/settings/lists/[kind]">): Promise<Metadata> {
  const { kind } = await params;
  return { title: isKind(kind) ? LOOKUP_META[kind].title : "Lists" };
}

/** One Settings list, in its module of the side menu, kept as its own table (add, reword, order, archive, put back). */
export default async function LookupPage({ params }: PageProps<"/settings/lists/[kind]">) {
  await requirePagePermission("app.settings");
  const { kind } = await params;
  if (!isKind(kind)) notFound();
  return <LookupEditor kind={kind} rows={await lookupsForEdit(kind)} />;
}
