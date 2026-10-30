/** The reset e-mail, in the office's English (staff mail; correspondence languages are for contacts). */
export function resetMail(name: string, link: string) {
  return {
    subject: "ASASLINE TMS — choose a new password",
    body: [
      `Hello ${name},`,
      "",
      "Open this link to choose a new password for ASASLINE TMS. It works once, for one hour:",
      link,
      "",
      "If you did not ask for it, ignore this e-mail: your password stays as it is.",
    ].join("\n"),
  };
}
