"use client";

import Link from "next/link";
import { ReasonDialog } from "@/components/shared/reason-dialog";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { unlink } from "../link-actions";
import type { LinkedContact } from "../link-queries";
import { ContactTypeIcon } from "./contact-type-icon";
import {
  AddLinkedDialog,
  EditLinkedDialog,
  type LinkContext,
  type LinkKind,
} from "./linked-dialogs";

/** One line under the name: a person's job and how to reach them, a location's address. */
function detailOf(o: LinkedContact["other"]) {
  const place = [o.street, [o.zip, o.city].filter(Boolean).join(" "), o.country].filter(Boolean);
  const reach = [o.email, o.phone ?? o.mobile].filter(Boolean);
  return (o.type === "person" ? [o.jobTitle, ...reach] : [place.join(", "), ...reach])
    .filter(Boolean)
    .join(" · ");
}

function LinkRow({ link, ctx }: { link: LinkedContact; ctx: LinkContext }) {
  const o = link.other;
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
      <span className="flex min-w-0 items-start gap-2">
        <ContactTypeIcon type={o.type} className="mt-0.5" />
        <span className="min-w-0">
          <Link href={`/contacts/${o.id}`} className="font-medium hover:underline">
            {[o.type === "person" ? o.salutation : null, o.name].filter(Boolean).join(" ")}
          </Link>{" "}
          <ToneBadge tone="info">{link.role}</ToneBadge>
          <span className="block text-muted-foreground">{detailOf(o) || "—"}</span>
        </span>
      </span>
      <span className="flex flex-wrap gap-2">
        {o.type !== "company" && (
          <EditLinkedDialog link={{ ...link, other: { ...o, type: o.type } }} ctx={ctx} />
        )}
        <ReasonDialog
          action={unlink}
          hidden={{ linkId: link.linkId, contactId: ctx.contactId }}
          trigger="Unlink"
          title={`Unlink ${o.name}?`}
          description="The contact stays in the contacts list; only this link ends, with your reason."
          confirmLabel="Unlink"
        />
      </span>
    </li>
  );
}

const ORDER: Record<string, number> = { company: 0, person: 1, location: 2 };

/**
 * Everything related to this contact in one list — companies, persons, locations, each a
 * contact of its own with its role here — and one "+ Add" whose dialog asks what it is.
 */
export function LinkedContacts({
  links,
  ctx,
  pageType,
}: {
  links: LinkedContact[];
  ctx: LinkContext;
  pageType: string;
}) {
  const kinds: LinkKind[] =
    pageType === "company" ? ["person", "location"] : ["person", "location", "company"];
  const rows = [...links].sort(
    (a, b) => ORDER[a.other.type] - ORDER[b.other.type] || a.other.name.localeCompare(b.other.name),
  );
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <h2 className="font-heading text-base font-medium">
          Related contacts <span className="text-muted-foreground">({rows.length})</span>
        </h2>
        <AddLinkedDialog kinds={kinds} ctx={ctx} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No persons or locations yet: add the people you deal with and the places you ship from
            or to.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((l) => (
              <LinkRow key={l.linkId} link={l} ctx={ctx} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
