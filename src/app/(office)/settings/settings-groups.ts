import type { LookupKind } from "@/domain/lookup-tables";
import type { Permission } from "@/domain/permissions";
import { LOOKUP_META } from "@/features/lookups/meta";

export type SettingsTab = { href: string; label: string; permission: Permission };

const S: Permission = "app.settings";
const page = (href: string, label: string, permission: Permission = S): SettingsTab => ({
  href: `/settings/${href}`,
  label,
  permission,
});
/** A Settings list sits in the module that offers it, under its own page. */
const list = (kind: LookupKind): SettingsTab => page(`lists/${kind}`, LOOKUP_META[kind].title);

/** The settings pages grouped by the module they shape; a page's URL does not depend on its group. */
export const SETTINGS_GROUPS: { label: string; tabs: SettingsTab[] }[] = [
  {
    label: "Office",
    tabs: [
      page("users", "Users"),
      page("permissions", "Permissions"),
      page("statuses", "Statuses"),
      page("holidays", "Holidays"),
      page("time", "Time", "audit.view"),
      page("audit", "Audit log", "audit.view"),
    ],
  },
  {
    label: "Contacts",
    tabs: [
      list("salutations"),
      list("professions"),
      list("contact-tags"),
      list("person-roles"),
      list("location-roles"),
      list("contact-doc-kinds"),
      page("countries", "Countries"),
      page("id-formats", "Number formats"),
      page("links", "Links"),
    ],
  },
  {
    label: "Activity",
    tabs: [
      page("activity-rules", "Automatic activities"),
      list("task-types"),
      list("withdraw-reasons"),
    ],
  },
  {
    label: "Quotations",
    tabs: [
      page("catalogue", "Catalogue", "catalogue.edit"),
      page("price-lists", "Price lists", "catalogue.edit"),
      page("rate-sources", "Rate sources"),
      page("line-items", "Line items"),
      page("loading", "Loading modes"),
      page("quotation-document", "Quotation document"),
      list("cancel-reasons"),
    ],
  },
  {
    label: "Bookings",
    tabs: [
      page("vessels", "Vessels", "bookings.edit"),
      page("ports", "Ports"),
      list("port-regions"),
      page("containers", "Containers"),
      list("container-types"),
      list("package-types"),
      list("seal-sources"),
      page("hs-codes", "HS codes"),
      page("release", "Release & tracking"),
    ],
  },
  {
    label: "Documents",
    tabs: [
      list("doc-types"),
      page("rules", "Document rules"),
      page("checklists", "Checklists"),
      page("filing", "Filing rules"),
    ],
  },
  {
    label: "Messages",
    tabs: [page("routing", "Routing"), page("templates", "Templates")],
  },
  { label: "Accounting", tabs: [page("accounting", "Accounting")] },
];
