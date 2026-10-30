import { SettingsNav } from "@/components/layout/settings-nav";
import { PageHeader } from "@/components/shared/page-header";
import { may, type Permission } from "@/domain/permissions";
import { requireUser } from "@/server/auth/dal";

type Tab = { href: string; label: string; permission: Permission };

const S: Permission = "app.settings";

/** The settings pages grouped by the module they shape; a page's URL does not depend on its group. */
const GROUPS: { label: string; tabs: Tab[] }[] = [
  {
    label: "Office",
    tabs: [
      { href: "/settings/users", label: "Users", permission: S },
      { href: "/settings/permissions", label: "Permissions", permission: S },
      { href: "/settings/statuses", label: "Statuses", permission: S },
      { href: "/settings/holidays", label: "Holidays", permission: S },
      { href: "/settings/time", label: "Time", permission: "audit.view" },
      { href: "/settings/audit", label: "Audit log", permission: "audit.view" },
    ],
  },
  {
    label: "Contacts",
    tabs: [
      { href: "/settings/id-formats", label: "Number formats", permission: S },
      { href: "/settings/links", label: "Links", permission: S },
    ],
  },
  {
    label: "Quotations",
    tabs: [
      { href: "/settings/catalogue", label: "Catalogue", permission: "catalogue.edit" },
      { href: "/settings/price-lists", label: "Price lists", permission: "catalogue.edit" },
      { href: "/settings/rate-sources", label: "Rate sources", permission: S },
      { href: "/settings/line-items", label: "Line items", permission: S },
      { href: "/settings/loading", label: "Loading modes", permission: S },
      { href: "/settings/quotation-document", label: "Quotation document", permission: S },
    ],
  },
  {
    label: "Bookings",
    tabs: [
      { href: "/settings/vessels", label: "Vessels", permission: "bookings.edit" },
      { href: "/settings/containers", label: "Containers", permission: S },
      { href: "/settings/hs-codes", label: "HS codes", permission: S },
      { href: "/settings/release", label: "Release & tracking", permission: S },
      { href: "/settings/activity-rules", label: "Automatic activities", permission: S },
    ],
  },
  {
    label: "Documents",
    tabs: [
      { href: "/settings/rules", label: "Document rules", permission: S },
      { href: "/settings/checklists", label: "Checklists", permission: S },
      { href: "/settings/filing", label: "Filing rules", permission: S },
    ],
  },
  {
    label: "Messages",
    tabs: [
      { href: "/settings/routing", label: "Routing", permission: S },
      { href: "/settings/templates", label: "Templates", permission: S },
    ],
  },
  {
    label: "Accounting",
    tabs: [{ href: "/settings/accounting", label: "Accounting", permission: S }],
  },
  {
    label: "Lists",
    tabs: [
      { href: "/settings/lists", label: "Lists", permission: S },
      { href: "/settings/countries", label: "Countries", permission: S },
      { href: "/settings/ports", label: "Ports", permission: S },
    ],
  },
];

/** Each page checks its own permission; the tabs only hide what the role cannot open. */
export default async function SettingsLayout({ children }: LayoutProps<"/settings">) {
  const user = await requireUser();
  const groups = GROUPS.map((g) => ({
    label: g.label,
    items: g.tabs
      .filter((t) => may(user, t.permission))
      .map(({ href, label }) => ({ href, label })),
  })).filter((g) => g.items.length > 0);
  return (
    <>
      <PageHeader
        title="Settings"
        description="How the office works, by module: who may do what, the lists, the rules and the documents."
      />
      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <SettingsNav groups={groups} />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
