import type { PickerOption } from "@/components/shared/search-picker";

export type Errors = Record<string, string[] | undefined> | undefined;

/** A catalogue item as its form reads it: the row's columns, or nothing for a new one. */
export type RateItemValues = Partial<
  Record<
    | "name"
    | "pol"
    | "pod"
    | "country"
    | "containerType"
    | "carrierId"
    | "transitDays"
    | "fromPlace"
    | "toPlace"
    | "docCode"
    | "freeDays"
    | "note"
    | "validUntil",
    string | number | null
  >
> & {
  id?: string;
  version?: number;
  category?: string;
  sellCents?: number;
  buyCents?: number;
  vatCode?: string;
  rateType?: string;
  scope?: string | null;
  freeKind?: string | null;
  side?: string | null;
};

/** What the catalogue picks from: ports, countries, boxes, the shipping lines and the truckers. */
export type RateItemLists = {
  ports: readonly PickerOption[];
  countries: readonly PickerOption[];
  containerTypes: readonly string[];
  carriers: readonly PickerOption[];
  truckers: readonly PickerOption[];
};

/** What every field of the form is given: the values, the field errors and the lists. */
export type Group = { v?: RateItemValues; fe: Errors; lists: RateItemLists };
