/** The letterhead (legacy COMPANY): printed on every invoice, credit note and quotation. */
export const COMPANY = {
  name: "ASASLINE S.A.",
  tag: "Shipping & Logistic",
  address: "Rue de Douvres 115, 1070 Bruxelles, Belgium",
  tel: "+32 23 15 14 15",
  email: "accounting.be@asasline.com",
  web: "https://asasline.com/",
  vat: "BE0772649540",
  bank: "Belfius Bank",
  iban: "BE41 0689 4162 5810",
  bic: "GKCCBEBB",
} as const;

/** The office as the VAT administration knows it (the Intervat declarant). */
export const DECLARANT = {
  vat: COMPANY.vat,
  name: COMPANY.name,
  street: "Rue de Douvres 115",
  postCode: "1070",
  city: "Bruxelles",
  email: COMPANY.email,
  phone: COMPANY.tel,
} as const;
