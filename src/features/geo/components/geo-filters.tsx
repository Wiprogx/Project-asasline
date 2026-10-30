import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Search, the archived rows, and — for a country's cities — only the ones to check. */
export function GeoFilters({
  q,
  archived,
  toCheck,
  placeholder,
}: {
  q?: string;
  archived?: boolean;
  /** Shown on a country's cities: the rows not from the list (added, or kept from a contact). */
  toCheck?: boolean | null;
  placeholder: string;
}) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <Input
        name="q"
        type="search"
        defaultValue={q ?? ""}
        placeholder={placeholder}
        aria-label="Search this table"
        className="w-64"
      />
      {toCheck !== null && toCheck !== undefined && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="check"
            value="1"
            defaultChecked={toCheck}
            className="size-4 accent-primary"
          />
          To check
        </label>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="archived"
          value="1"
          defaultChecked={archived}
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
