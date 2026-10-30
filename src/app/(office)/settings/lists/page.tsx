import type { Metadata } from "next";
import { SearchInput } from "@/components/shared/search-input";
import { LOOKUP_KINDS } from "@/domain/lookup-tables";
import { LookupIndex } from "@/features/lookups/components/lookup-index";
import { requirePagePermission } from "@/server/auth/dal";

export const metadata: Metadata = { title: "Lists" };

/** The office's lists, each a table of its own with its page (add, reword, order, archive). */
export default async function ListsPage({ searchParams }: PageProps<"/settings/lists">) {
  await requirePagePermission("app.settings");
  const { q } = await searchParams;
  return (
    <div className="grid gap-4">
      <SearchInput placeholder="Search a list" />
      <LookupIndex kinds={LOOKUP_KINDS} q={typeof q === "string" ? q : ""} />
    </div>
  );
}
