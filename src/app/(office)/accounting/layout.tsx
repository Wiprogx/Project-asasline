import { SubNav } from "@/components/layout/sub-nav";
import { requirePagePermission } from "@/server/auth/dal";

/** Tabs only: each page gives its own title, so a screen never carries two h1s. */
export default async function AccountingLayout({ children }: LayoutProps<"/accounting">) {
  await requirePagePermission("app.accounting");
  return (
    <>
      <SubNav items={[{ href: "/accounting", label: "Invoices" }]} />
      {children}
    </>
  );
}
