import { cookies } from "next/headers";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NAV } from "@/config/navigation";
import { can, ROLE_LABEL } from "@/domain/permissions";
import { logout } from "@/features/auth/actions";
import { requireUser } from "@/server/auth/dal";

export default async function OfficeLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  const allowed = NAV.filter((i) => i.permission === null || can(user.role, i.permission)).map(
    (i) => i.href,
  );

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar
        allowed={allowed}
        user={{ name: user.name, roleLabel: ROLE_LABEL[user.role] }}
        logout={logout}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">ASASLINE S.A. · Brussels</span>
        </header>
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
