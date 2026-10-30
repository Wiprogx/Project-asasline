import { NativeSelect } from "@/components/shared/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PortScope } from "../queries";

/** Search by code, name or other name; narrow to a region; or look at the archived ports. */
export function PortFilters({
  scope,
  regions,
}: {
  scope: PortScope;
  regions: readonly { value: string; label: string }[];
}) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <Input
        name="q"
        type="search"
        defaultValue={scope.q ?? ""}
        placeholder="Code, name or other name"
        aria-label="Search ports"
        className="w-56"
      />
      <NativeSelect
        name="region"
        options={regions}
        placeholder="Every region"
        defaultValue={scope.regionId ?? ""}
        aria-label="Region"
        className="w-56"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="archived"
          value="1"
          defaultChecked={scope.archived}
          className="size-4 accent-primary"
        />
        Archived
      </label>
      <Button type="submit" variant="outline" size="sm">
        Show
      </Button>
    </form>
  );
}
