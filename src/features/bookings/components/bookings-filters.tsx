"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { NativeSelect } from "@/components/shared/native-select";
import { PERIOD_KEYS, PERIOD_LABEL } from "@/domain/periods";

/**
 * The list's filters (legacy fbar): the period, counted on the sailing date; export or
 * import; the shipping line; the comparison with the period before. All in the URL, so a
 * view can be bookmarked and shared.
 */
export function BookingsFilters({ carriers }: { carriers: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "period" && (!value || value === "all")) next.delete("cmp");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const period = params.get("period") ?? "all";
  // The tick changes at once; the URL and the figures follow.
  const [cmp, setCmp] = useOptimistic(params.get("cmp") === "prev");
  const [, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="Period"
        className="w-40"
        value={period}
        onChange={(e) => set("period", e.target.value === "all" ? "" : e.target.value)}
        options={PERIOD_KEYS.map((k) => ({ value: k, label: PERIOD_LABEL[k] }))}
      />
      <NativeSelect
        aria-label="Export or import"
        className="w-40"
        value={params.get("kind") ?? ""}
        onChange={(e) => set("kind", e.target.value)}
        options={[
          { value: "", label: "All types" },
          { value: "export", label: "Export" },
          { value: "import", label: "Import" },
          { value: "both", label: "Export & import" },
        ]}
      />
      <NativeSelect
        aria-label="Shipping line"
        className="w-48"
        value={params.get("carrier") ?? ""}
        onChange={(e) => set("carrier", e.target.value)}
        options={[
          { value: "", label: "All carriers" },
          ...carriers.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
      {period !== "all" && (
        <label className="flex min-h-6 items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={cmp}
            onChange={(e) => {
              const on = e.target.checked;
              start(() => {
                setCmp(on);
                set("cmp", on ? "prev" : "");
              });
            }}
          />
          Compare with the period before
        </label>
      )}
    </div>
  );
}
