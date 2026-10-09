/**
 * The office's outward channels (legacy AUTO_SEND, WA_NUMBERS): whether tracking news goes out
 * by itself and on which channel, and the WhatsApp numbers the office writes from. Settings
 * values (invariant 8); these are the legacy defaults until saved.
 */
export const AUTO_CHANNELS = ["email", "whatsapp", "both"] as const;
export type AutoChannel = (typeof AUTO_CHANNELS)[number];

export type AutoSend = { enabled: boolean; channel: AutoChannel };
export const DEFAULT_AUTO_SEND: AutoSend = { enabled: true, channel: "both" };

/**
 * The channel an automatic letter takes to this contact: WhatsApp when allowed and the contact
 * has a number, else e-mail when allowed and known; nothing when neither — then nothing goes.
 */
export function autoChannelFor(
  setting: AutoSend,
  to: { email: string | null; whatsapp: string | null },
): "email" | "whatsapp" | null {
  if (!setting.enabled) return null;
  if (setting.channel !== "email" && to.whatsapp) return "whatsapp";
  if (setting.channel !== "whatsapp" && to.email) return "email";
  return null;
}

export type WhatsAppNumber = { label: string; number: string; phoneId: string; active: boolean };

export const DEFAULT_WHATSAPP_NUMBERS: readonly WhatsAppNumber[] = [
  { label: "ASASLINE — main", number: "+32 23 15 14 15", phoneId: "", active: true },
];

/** The number a message goes out from: the active one, else the first (legacy waMain). */
export const activeNumber = (list: readonly WhatsAppNumber[]) =>
  list.find((n) => n.active) ?? list[0] ?? null;

/** `label | number | phone id | yes/no` — one number per line, as Settings edits them. */
export const whatsAppLines = (list: readonly WhatsAppNumber[]) =>
  list.map((n) => [n.label, n.number, n.phoneId, n.active ? "yes" : "no"].join(" | ")).join("\n");

export function parseWhatsAppLines(text: string): {
  numbers: WhatsAppNumber[];
  problems: string[];
} {
  const numbers: WhatsAppNumber[] = [];
  const problems: string[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [label = "", number = "", phoneId = "", active = "no"] = line
        .split("|")
        .map((x) => x.trim());
      if (!label || label.length > 60)
        problems.push(`Line ${i + 1}: a label (up to 60 characters).`);
      else if (!/^\+?[\d\s().-]{6,25}$/.test(number))
        problems.push(`Line ${i + 1}: a phone number like +32 2 315 14 15.`);
      else if (!/^\d{0,30}$/.test(phoneId))
        problems.push(`Line ${i + 1}: the WhatsApp Business phone id is digits, or nothing.`);
      else if (!/^(yes|no)$/i.test(active))
        problems.push(`Line ${i + 1}: yes or no in the last place.`);
      else if (numbers.some((n) => n.number === number))
        problems.push(`Line ${i + 1}: ${number} twice.`);
      else numbers.push({ label, number, phoneId, active: /^yes$/i.test(active) });
    });
  if (numbers.filter((n) => n.active).length > 1) problems.push("One number is active at a time.");
  return { numbers, problems };
}
