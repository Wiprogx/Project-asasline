import { SubNav } from "@/components/layout/sub-nav";
import { requirePagePermission } from "@/server/auth/dal";

/** Tabs only: each page gives its own title, so a screen never carries two h1s. */
export default async function AccountingLayout({ children }: LayoutProps<"/accounting">) {
  await requirePagePermission("app.accounting");
  return (
    <>
      <SubNav
        items={[
          { href: "/accounting", label: "Invoices", exact: true },
          { href: "/accounting/bills", label: "Bills" },
          { href: "/accounting/payments", label: "Payments" },
          { href: "/accounting/bank", label: "Bank" },
          { href: "/accounting/journal", label: "Journal" },
          { href: "/accounting/reports", label: "Reports" },
          { href: "/accounting/aged", label: "Aged" },
          { href: "/accounting/vat", label: "VAT" },
          { href: "/accounting/listings", label: "Listings" },
          { href: "/accounting/margins", label: "Margins" },
        ]}
      />
      {children}
    </>
  );
}
