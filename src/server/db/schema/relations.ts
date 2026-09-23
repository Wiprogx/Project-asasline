import { relations } from "drizzle-orm";
import { activities } from "./activities";
import { contactAddresses, contactBankAccounts, contacts } from "./contacts";
import { users } from "./identity";
import { bookings, containers, quotationLines, quotationRoutes, quotations } from "./shipments";

export const contactsRelations = relations(contacts, ({ many }) => ({
  addresses: many(contactAddresses),
  bankAccounts: many(contactBankAccounts),
  bookings: many(bookings, { relationName: "client" }),
  quotations: many(quotations),
}));

export const contactAddressesRelations = relations(contactAddresses, ({ one }) => ({
  contact: one(contacts, { fields: [contactAddresses.contactId], references: [contacts.id] }),
}));

export const contactBankAccountsRelations = relations(contactBankAccounts, ({ one }) => ({
  contact: one(contacts, { fields: [contactBankAccounts.contactId], references: [contacts.id] }),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  client: one(contacts, { fields: [quotations.clientId], references: [contacts.id] }),
  routes: many(quotationRoutes),
  bookings: many(bookings),
}));

export const quotationRoutesRelations = relations(quotationRoutes, ({ one, many }) => ({
  quotation: one(quotations, {
    fields: [quotationRoutes.quotationId],
    references: [quotations.id],
  }),
  lines: many(quotationLines),
}));

export const quotationLinesRelations = relations(quotationLines, ({ one }) => ({
  route: one(quotationRoutes, {
    fields: [quotationLines.routeId],
    references: [quotationRoutes.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  client: one(contacts, {
    fields: [bookings.clientId],
    references: [contacts.id],
    relationName: "client",
  }),
  quotation: one(quotations, { fields: [bookings.quotationId], references: [quotations.id] }),
  payer: one(contacts, {
    fields: [bookings.payerId],
    references: [contacts.id],
    relationName: "payer",
  }),
  shipper: one(contacts, {
    fields: [bookings.shipperId],
    references: [contacts.id],
    relationName: "shipper",
  }),
  consignee: one(contacts, {
    fields: [bookings.consigneeId],
    references: [contacts.id],
    relationName: "consignee",
  }),
  notify: one(contacts, {
    fields: [bookings.notifyId],
    references: [contacts.id],
    relationName: "notify",
  }),
  containers: many(containers),
}));

export const containersRelations = relations(containers, ({ one }) => ({
  booking: one(bookings, { fields: [containers.bookingId], references: [bookings.id] }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  assignee: one(users, { fields: [activities.assigneeId], references: [users.id] }),
}));
