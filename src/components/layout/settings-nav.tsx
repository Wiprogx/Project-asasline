"use client";

import {
  BookOpenIcon,
  Building2Icon,
  CalculatorIcon,
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  FileCheckIcon,
  FileTextIcon,
  ListTodoIcon,
  type LucideIcon,
  MailIcon,
  SearchIcon,
  ShipIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SettingsGroup = { label: string; items: { href: string; label: string }[] };

/** A module's mark in the menu; one it does not know gets a book. */
const ICON: Record<string, LucideIcon> = {
  Office: Building2Icon,
  Contacts: UsersIcon,
  Quotations: FileTextIcon,
  Bookings: ShipIcon,
  Documents: FileCheckIcon,
  Messages: MailIcon,
  Accounting: CalculatorIcon,
  Activity: ListTodoIcon,
};

const isOn = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/** Phone: one grouped picker in place of the side menu; picking a page opens it. */
function SettingsPicker({ groups, current }: { groups: SettingsGroup[]; current: string | null }) {
  const router = useRouter();
  const items = groups.flatMap((g) => g.items.map((i) => ({ value: i.href, label: i.label })));
  return (
    <Select
      items={items}
      value={current}
      onValueChange={(href) => {
        if (typeof href === "string") router.push(href);
      }}
    >
      <SelectTrigger className="w-full lg:hidden" aria-label="Settings page">
        <SelectValue placeholder="Choose a setting" />
      </SelectTrigger>
      <SelectContent>
        {groups.map((g) => (
          <SelectGroup key={g.label}>
            <SelectLabel>{g.label}</SelectLabel>
            {g.items.map((i) => (
              <SelectItem key={i.href} value={i.href}>
                {i.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

function ModuleLinks({ group, pathname }: { group: SettingsGroup; pathname: string }) {
  return (
    <div className="mt-0.5 mb-1 ml-[1.1rem] grid gap-0.5 border-l pl-2">
      {group.items.map((i) => {
        const on = isOn(pathname, i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "relative w-full justify-start font-normal text-muted-foreground",
              on &&
                "bg-muted font-medium text-foreground before:absolute before:inset-y-1.5 before:-left-[0.5625rem] before:w-0.5 before:rounded-full before:bg-primary",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </div>
  );
}

/** One module, folded or open; its title says which module holds the page shown. */
function ModuleSection({
  group,
  pathname,
  open,
  onOpenChange,
}: {
  group: SettingsGroup;
  pathname: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const here = group.items.some((i) => isOn(pathname, i.href));
  const Icon = ICON[group.label] ?? BookOpenIcon;
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <h2>
        <CollapsibleTrigger
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-full justify-start gap-2 font-medium text-muted-foreground",
            here && "text-foreground",
          )}
        >
          <Icon aria-hidden className="size-4" />
          {group.label}
          <ChevronRightIcon
            aria-hidden
            className={cn("ml-auto size-4 opacity-60 transition-transform", open && "rotate-90")}
          />
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent>
        <ModuleLinks group={group} pathname={pathname} />
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Desktop: the pages folded under their module. The module of the page shown opens by itself,
 * the others as the user opens them; a search opens every module that matches.
 */
function SettingsMenu({ groups, pathname }: { groups: SettingsGroup[]; pathname: string }) {
  const [q, setQ] = useState("");
  const current = groups.find((g) => g.items.some((i) => isOn(pathname, i.href)))?.label;
  const [opened, setOpened] = useState<string[]>(current ? [current] : []);
  const [seen, setSeen] = useState(current);
  if (seen !== current) {
    setSeen(current);
    if (current && !opened.includes(current)) setOpened([...opened, current]);
  }
  const s = q.trim().toLowerCase();
  const shown = groups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (i) => !s || i.label.toLowerCase().includes(s) || g.label.toLowerCase().includes(s),
      ),
    }))
    .filter((g) => g.items.length > 0);
  const allOpen = groups.every((g) => opened.includes(g.label));
  const allClosed = opened.length === 0;
  return (
    <div className="hidden gap-3 lg:grid">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a setting"
          aria-label="Find a setting"
          className="pl-8"
        />
      </div>
      {!s && (
        <div className="-my-1 flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            disabled={allOpen}
            onClick={() => setOpened(groups.map((g) => g.label))}
          >
            <ChevronsUpDownIcon aria-hidden /> Open all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            disabled={allClosed}
            onClick={() => setOpened([])}
          >
            <ChevronsDownUpIcon aria-hidden /> Close all
          </Button>
        </div>
      )}
      <nav aria-label="Settings" className="grid gap-1">
        {shown.map((g) => (
          <ModuleSection
            key={g.label}
            group={g}
            pathname={pathname}
            open={Boolean(s) || opened.includes(g.label)}
            onOpenChange={(o) =>
              setOpened(o ? [...opened, g.label] : opened.filter((x) => x !== g.label))
            }
          />
        ))}
        {shown.length === 0 && (
          <p className="px-2.5 text-sm text-muted-foreground">No setting matches.</p>
        )}
      </nav>
    </div>
  );
}

/** Settings' own navigation: the pages grouped by the module they shape. */
export function SettingsNav({ groups }: { groups: SettingsGroup[] }) {
  const pathname = usePathname();
  const current = groups.flatMap((g) => g.items).find((i) => isOn(pathname, i.href))?.href ?? null;
  return (
    <div className="lg:sticky lg:top-4 lg:max-h-[calc(100svh-2rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
      <SettingsPicker groups={groups} current={current} />
      <SettingsMenu groups={groups} pathname={pathname} />
    </div>
  );
}
