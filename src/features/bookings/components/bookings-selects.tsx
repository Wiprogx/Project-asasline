"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/shared/native-select";

/**
 * The two picks of the list's filter bar (legacy fbar): export or import, and the shipping line.
 * Both in the URL, so a view can be bookmarked and shared.
 */
export function BookingsSelects({ carriers }: { carriers: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  return (
    <>
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
    </>
  );
}
