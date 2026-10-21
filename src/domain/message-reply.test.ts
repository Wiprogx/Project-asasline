import { describe, expect, it } from "vitest";
import { replyDraft } from "./message-reply";

const msg = {
  id: "m1",
  channel: "email",
  subject: "Invoice for SB2610001",
  fromText: "someone@example.com",
  contactId: "c1",
  contactEmail: "office@client.be",
  contactWhatsapp: "+32470000000",
};

describe("replyDraft", () => {
  it("answers an e-mail to the contact's own address with Re: on the subject", () => {
    expect(replyDraft(msg)).toEqual({
      replyToId: "m1",
      channel: "email",
      subject: "Re: Invoice for SB2610001",
      to: "office@client.be",
      contactId: "c1",
    });
  });

  it("answers a WhatsApp on WhatsApp", () => {
    expect(replyDraft({ ...msg, channel: "whatsapp" })).toMatchObject({
      channel: "whatsapp",
      to: "+32470000000",
    });
  });

  it("falls back to the address it came from when the sender is not a contact", () => {
    expect(
      replyDraft({ ...msg, contactId: null, contactEmail: null, contactWhatsapp: null }),
    ).toMatchObject({ to: "someone@example.com", contactId: null });
  });

  it("answers a call or a web message by e-mail, never twice prefixed", () => {
    expect(replyDraft({ ...msg, channel: "call", subject: "Re: SI" })).toMatchObject({
      channel: "email",
      subject: "Re: SI",
    });
  });
});
