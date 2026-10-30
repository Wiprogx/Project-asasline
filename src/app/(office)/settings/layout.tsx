import { SettingsNav } from "@/components/layout/settings-nav";
import { PageHeader } from "@/components/shared/page-header";
import { may } from "@/domain/permissions";
import { requireUser } from "@/server/auth/dal";
import { SETTINGS_GROUPS } from "./settings-groups";

/** Each page checks its own permission; the tabs only hide what the role cannot open. */
export default async function SettingsLayout({ children }: LayoutProps<"/settings">) {
  const user = await requireUser();
  const groups = SETTINGS_GROUPS.map((g) => ({
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
