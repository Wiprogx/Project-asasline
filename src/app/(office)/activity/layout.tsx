import { SubNav } from "@/components/layout/sub-nav";
import { PageHeader } from "@/components/shared/page-header";
import { requirePagePermission } from "@/server/auth/dal";
import { officeToday } from "@/server/clock";

export default async function ActivityLayout({ children }: LayoutProps<"/activity">) {
  await requirePagePermission("app.activity");
  return (
    <>
      <PageHeader title="Activity" description={`Today in Brussels: ${officeToday()}`} />
      <SubNav
        items={[
          { href: "/activity", label: "List", exact: true },
          { href: "/activity/calendar", label: "Calendar" },
        ]}
      />
      {children}
    </>
  );
}
