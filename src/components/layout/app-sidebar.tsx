"use client";

import { LogOutIcon, ShipIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NAV } from "@/config/navigation";

type Props = {
  allowed: string[];
  user: { name: string; roleLabel: string };
  logout: () => Promise<void>;
};

export function AppSidebar({ allowed, user, logout }: Props) {
  const pathname = usePathname();
  const items = NAV.filter((i) => allowed.includes(i.href));
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 px-2 py-1.5">
          <ShipIcon className="size-5 shrink-0 text-primary" />
          <span className="truncate font-heading font-semibold tracking-wide group-data-[collapsible=icon]:hidden">
            ASASLINE <span className="font-normal text-muted-foreground">TMS</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    render={<Link href={item.href} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {!item.migrated && (
                    <SidebarMenuBadge className="text-[10px] text-muted-foreground">
                      soon
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Link
          href="/account"
          className="rounded-md px-2 py-1 text-xs group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent"
        >
          <div className="truncate font-medium">{user.name}</div>
          <div className="text-muted-foreground">{user.roleLabel} · My account</div>
        </Link>
        <form action={logout}>
          <SidebarMenuButton type="submit" tooltip="Sign out">
            <LogOutIcon />
            <span>Sign out</span>
          </SidebarMenuButton>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
