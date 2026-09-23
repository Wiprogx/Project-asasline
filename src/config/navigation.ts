import {
  CalculatorIcon,
  FileTextIcon,
  HomeIcon,
  ListTodoIcon,
  MessagesSquareIcon,
  SettingsIcon,
  ShipIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/domain/permissions";

/** The legacy APPS launcher, one entry per app; `migrated: false` shows a "coming" marker. */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission | null;
  migrated: boolean;
};

export const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: HomeIcon, permission: null, migrated: true },
  {
    href: "/activity",
    label: "Activity",
    icon: ListTodoIcon,
    permission: "app.activity",
    migrated: false,
  },
  {
    href: "/quotations",
    label: "Quotations",
    icon: FileTextIcon,
    permission: "app.quotations",
    migrated: true,
  },
  {
    href: "/bookings",
    label: "Bookings",
    icon: ShipIcon,
    permission: "app.bookings",
    migrated: true,
  },
  {
    href: "/contacts",
    label: "Contacts",
    icon: UsersIcon,
    permission: "app.contacts",
    migrated: true,
  },
  {
    href: "/discuss",
    label: "Discuss",
    icon: MessagesSquareIcon,
    permission: "app.discuss",
    migrated: false,
  },
  {
    href: "/accounting",
    label: "Accounting",
    icon: CalculatorIcon,
    permission: "app.accounting",
    migrated: false,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
    permission: "app.settings",
    migrated: true,
  },
];
