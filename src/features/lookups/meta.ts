import type { LookupKind } from "@/domain/lookup-tables";

export type LookupMeta = {
  /** The list's name in Settings › Lists. */
  title: string;
  description: string;
  /** What one row is, as the column header and the field call it. */
  noun: string;
  placeholder: string;
  /** The list's yes/no column (server/lookups FLAGS), as the checkbox and the column say it. */
  flag?: { label: string; column: string };
};

export const LOOKUP_META: Record<LookupKind, LookupMeta> = {
  "cancel-reasons": {
    title: "Cancel reasons",
    description:
      "Offered when a quotation or a booking is cancelled; they make “why do we lose shipments” a report. An archived reason is no longer offered but stays on the records that name it.",
    noun: "Reason",
    placeholder: "Goods not ready",
  },
  "withdraw-reasons": {
    title: "Withdraw reasons",
    description:
      "Offered when a task is withdrawn. The app withdraws some tasks by itself — a cancelled booking or quotation, a document rule that no longer applies — with its own reasons, which can be reworded but not archived.",
    noun: "Reason",
    placeholder: "Done outside the system",
  },
  salutations: {
    title: "Salutations",
    description: "How a person is addressed: Mr, Mrs, Dr… Offered on a person's form.",
    noun: "Salutation",
    placeholder: "Mr",
  },
  "doc-types": {
    title: "Document types",
    description:
      "The transport document a quotation or a booking carries: offered on both, read by the printed copies, the letters and the document rules. One that travels on paper has its originals followed on the Tracking tab.",
    noun: "Document type",
    placeholder: "ORIGINAL BL",
    flag: { label: "Its originals travel on paper", column: "On paper" },
  },
  "task-types": {
    title: "Task types",
    description:
      "What kind of task: e-mail, call, upload, to do, meeting, approval, reminder. Offered on a new task; an automatic activity names its type in Settings › Automatic activities.",
    noun: "Task type",
    placeholder: "Meeting",
  },
  "package-types": {
    title: "Package types",
    description:
      "How a container's goods are packed: bales, cartons, pallets… Offered on a box's goods and its HS lines.",
    noun: "Package type",
    placeholder: "Bales",
  },
  "seal-sources": {
    title: "Seal sources",
    description:
      'Who sealed a container: the trucker, the carrier, customs… Typed after the seal number on a box: "ABC1234 (Carrier)".',
    noun: "Seal source",
    placeholder: "Carrier",
  },
  "person-roles": {
    title: "Person roles",
    description:
      "What a person linked to a contact is to it: director, accounting, operations… (the role on the link; also a company's role seen from a person).",
    noun: "Role",
    placeholder: "Director",
  },
  "location-roles": {
    title: "Location roles",
    description:
      "What a location linked to a contact is to it: loading, delivery, consignee, invoicing… (the role on the link).",
    noun: "Role",
    placeholder: "Delivery address",
  },
  "contact-doc-kinds": {
    title: "Contact document kinds",
    description:
      "What a paper kept on a contact is: a contract, a power of attorney, an ID. A kind named in the file's name is picked by itself.",
    noun: "Kind",
    placeholder: "Contract",
  },
  professions: {
    title: "Professions",
    description:
      "The trades a contact is in: the five a booking picks its parties from, then what the cargo is. Offered as you type on a contact; a new word typed there is added here.",
    noun: "Profession",
    placeholder: "Transporter",
  },
  "contact-tags": {
    title: "Contact tags",
    description:
      "Free labels on a contact: offered as you type, searched in the list; a new word typed on a contact is added here.",
    noun: "Tag",
    placeholder: "Key account",
  },
  "container-types": {
    title: "Container types",
    description:
      "Container sizes and types by ISO code (20DV, 40HC…): offered on quotations, bookings, boxes and the catalogue. Tare and maximum gross per type are in Settings › Containers.",
    noun: "Container type",
    placeholder: "45HC",
  },
  "port-regions": {
    title: "Port regions",
    description:
      "The regions ports are filed under in Settings › Ports (North Africa, West Africa…): picked on a port, and the Ports table filters by them.",
    noun: "Region",
    placeholder: "Indian Ocean islands",
  },
};
