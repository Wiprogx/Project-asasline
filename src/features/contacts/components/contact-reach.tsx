import { Button, buttonVariants } from "@/components/ui/button";

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
        <a
          href={`tel:${digits(call)}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Call {call}
        </a>
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
        <a href={`mailto:${email}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Email
        </a>
      )}
    </div>
  );
}
