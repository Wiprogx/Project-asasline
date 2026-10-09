import { z } from "zod";

/** `name` is checked against the server's table registry in the action. */
export const saveListSchema = z.object({
  name: z.string().min(1),
  version: z.coerce.number().int().min(0),
  values: z.string().max(50_000).default(""),
});

export const LIST_META: Record<string, { title: string; description: string }> = {
  cancelReasons: {
    title: "Cancel reasons",
    description:
      "Offered when a booking is cancelled; it makes 'why do we lose shipments' a report.",
  },
  containerTypes: {
    title: "Container types",
    description: "Offered on quotations and bookings (ISO size/type codes such as 40HC).",
  },
  addressTypes: {
    title: "Address types",
    description: "Kinds of child address on a contact: loading, delivery, consignee, billing…",
  },
  packageTypes: {
    title: "Package types",
    description: "Offered on a container's goods: bales, cartons, pallets… (legacy PACKAGE_TYPES).",
  },
  activityTypes: {
    title: "Task types",
    description:
      "What kind of task: e-mail, call, upload, to do, meeting, approval, reminder (legacy ACTIVITY_TYPES).",
  },
  withdrawReasons: {
    title: "Withdraw reasons",
    description: "Offered when a task is withdrawn (legacy WITHDRAW_REASONS).",
  },
  professions: {
    title: "Professions",
    description:
      "The trades a contact is in: the five a booking picks its parties from, then what the cargo is (legacy PROFESSIONS). Offered as you type on a contact.",
  },
  contactTags: {
    title: "Contact tags",
    description:
      "Free labels on a contact (legacy tags): offered as you type, searched in the list.",
  },
  paperDocs: {
    title: "Paper documents",
    description:
      "Transport document types whose originals travel on paper (ORIGINAL BL, CMR): the booking's Tracking tab asks how they were sent.",
  },
};
