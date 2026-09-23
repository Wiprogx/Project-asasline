import { SubNav } from "@/components/layout/sub-nav";
import { PageHeader } from "@/components/shared/page-header";
import { can, type Permission } from "@/domain/permissions";
import { requireUser } from "@/server/auth/dal";

const TABS: { href: string; label: string; permission: Permission }[] = [
  { href: "/settings/people", label: "People", permission: "app.settings" },
  { href: "/settings/lists", label: "Lists", permission: "app.settings" },
  { href: "/settings/rules", label: "Document rules", permission: "app.settings" },
  { href: "/settings/holidays", label: "Holidays", permission: "app.settings" },
  { href: "/settings/vessels", label: "Vessels", permission: "bookings.edit" },
  { href: "/settings/audit", label: "Audit log", permission: "audit.view" },
];

/** Each page checks its own permission; the tabs only hide what the role cannot open. */
export default async function SettingsLayout({ children }: LayoutProps<"/settings">) {
  const user = await requireUser();
  const tabs = TABS.filter((t) => can(user.role, t.permission));
  return (
    <>
      <PageHeader title="Settings" />
      <SubNav items={tabs} />
      {children}
    </>
  );
}
