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
};
