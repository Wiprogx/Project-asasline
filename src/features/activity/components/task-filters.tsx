"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/shared/native-select";
import { cn } from "@/lib/utils";

const STATES = [
  ["open", "Open"],
  ["done", "Done"],
  ["withdrawn", "Withdrawn"],
] as const;

/** Every filter is in the URL: a view can be bookmarked, shared and survives a reload. */
export function TaskFilters({ staff }: { staff: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const who = params.get("who") ?? "mine";
  const state = params.get("state") ?? "open";

  const hrefWith = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    return `${pathname}?${next.toString()}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="Whose tasks"
        className="w-48"
        value={who}
        onChange={(e) => router.replace(hrefWith("who", e.target.value))}
        options={[
          { value: "mine", label: "My tasks" },
          { value: "all", label: "Everyone" },
          ...staff.map((s) => ({ value: s.id, label: s.name })),
        ]}
      />
      <nav aria-label="Task state" className="flex gap-1">
        {STATES.map(([value, label]) => (
          <Link
            key={value}
            href={hrefWith("state", value)}
            aria-current={state === value ? "page" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm",
              state === value
                ? "bg-accent font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
