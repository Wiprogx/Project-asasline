import { LiveRefresh } from "@/components/layout/live-refresh";
import { SubNav } from "@/components/layout/sub-nav";
import { PageHeader } from "@/components/shared/page-header";
import { ROLE_LABEL } from "@/domain/permissions";
import { requirePagePermission } from "@/server/auth/dal";

/** Discuss: the queue of what waits for an answer, the office's rooms, and every message. */
export default async function DiscussLayout({ children }: LayoutProps<"/discuss">) {
  const user = await requirePagePermission("app.discuss");
  return (
    <>
      <PageHeader title="Discuss" />
      <SubNav
        items={[
          { href: "/discuss/queue", label: "Waiting" },
          { href: "/discuss/room/office", label: "Office" },
          { href: `/discuss/room/${user.role}`, label: ROLE_LABEL[user.role] },
          { href: "/discuss/all", label: "All messages" },
        ]}
      />
      <LiveRefresh />
      {children}
    </>
  );
}
