import { Button } from "@/components/ui/button";

const digits = (v: string) => v.replace(/[^\d+]/g, "");

/** Call, WhatsApp or write to the contact in one tap (legacy phone actions). */
export function ContactReach({
  phone,
  mobile,
  whatsapp,
  email,
}: {
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  email: string | null;
}) {
  const call = mobile || phone;
  const wa = whatsapp || mobile;
  if (!call && !wa && !email) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {call && (
        <Button variant="outline" size="sm" render={<a href={`tel:${digits(call)}`} />}>
          Call {call}
        </Button>
      )}
      {wa && (
        <Button
          variant="outline"
          size="sm"
          render={
            <a
              href={`https://wa.me/${digits(wa).replace(/^\+/, "")}`}
              target="_blank"
              rel="noopener"
            />
          }
        >
          WhatsApp
        </Button>
      )}
      {email && (
        <Button variant="outline" size="sm" render={<a href={`mailto:${email}`} />}>
          Email
        </Button>
      )}
    </div>
  );
}
