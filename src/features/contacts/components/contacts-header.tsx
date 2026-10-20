import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";

/** The list's title with its count, the active/archived toggle and "New contact". */
export function ContactsHeader({ count, archived }: { count: number; archived: boolean }) {
  return (
    <PageHeader
      title="Contacts"
      description={`${count} ${archived ? "archived " : ""}contacts`}
      actions={
        <>
          <Link
            href={archived ? "/contacts" : "/contacts?archived=1"}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {archived ? "Show active" : "Show archived"}
          </Link>
          <Link href="/contacts/new" className={buttonVariants({ size: "sm" })}>
            New contact
          </Link>
        </>
      }
    />
  );
}
