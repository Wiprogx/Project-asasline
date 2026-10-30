import { relations } from "drizzle-orm";
import { activities } from "./activities";
import { contactAddresses, contactBankAccounts, contacts } from "./contacts";
import { users } from "./identity";
import { cancelReasons, docTypes } from "./lists";
import { priceListLines, priceLists, rateItems } from "./pricing";
import {
  bookingLegs,
  bookings,
  containers,
  quotationLines,
  quotationRoutes,
  quotations,
  vessels,
} from "./shipments";

export const contactsRelations = relations(contacts, ({ many }) => ({
  addresses: many(contactAddresses),
  bankAccounts: many(contactBankAccounts),
  bookings: many(bookings, { relationName: "client" }),
  quotations: many(quotations),
  priceLists: many(priceLists),
}));

export const rateItemsRelations = relations(rateItems, ({ many }) => ({
  listLines: many(priceListLines),
}));

export const priceListsRelations = relations(priceLists, ({ one, many }) => ({
  contact: one(contacts, { fields: [priceLists.contactId], references: [contacts.id] }),
  lines: many(priceListLines),
}));

export const priceListLinesRelations = relations(priceListLines, ({ one }) => ({
  list: one(priceLists, { fields: [priceListLines.priceListId], references: [priceLists.id] }),
  item: one(rateItems, { fields: [priceListLines.itemId], references: [rateItems.id] }),
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
  cancelReason: one(cancelReasons, {
    fields: [quotations.cancelReasonId],
    references: [cancelReasons.id],
  }),
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
  item: one(rateItems, { fields: [quotationLines.itemId], references: [rateItems.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  vessel: one(vessels, { fields: [bookings.vesselId], references: [vessels.id] }),
  legs: many(bookingLegs),
  cancelReason: one(cancelReasons, {
    fields: [bookings.cancelReasonId],
    references: [cancelReasons.id],
  }),
  docTypeRow: one(docTypes, { fields: [bookings.docTypeId], references: [docTypes.id] }),
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
  // The office's counterparts on the file (domain/booking-parties OFFICE_PARTIES).
  docCheck: one(contacts, {
    fields: [bookings.docCheckId],
    references: [contacts.id],
    relationName: "docCheck",
  }),
  shippingCo: one(contacts, {
    fields: [bookings.shippingCoId],
    references: [contacts.id],
    relationName: "shippingCo",
  }),
  transporter: one(contacts, {
    fields: [bookings.transporterId],
    references: [contacts.id],
    relationName: "transporter",
  }),
  destForwarder: one(contacts, {
    fields: [bookings.destForwarderId],
    references: [contacts.id],
    relationName: "destForwarder",
  }),
  forwarder: one(contacts, {
    fields: [bookings.forwarderId],
    references: [contacts.id],
    relationName: "forwarder",
  }),
  customsAgent: one(contacts, {
    fields: [bookings.customsAgentId],
    references: [contacts.id],
    relationName: "customsAgent",
  }),
  containers: many(containers),
}));

export const containersRelations = relations(containers, ({ one }) => ({
  booking: one(bookings, { fields: [containers.bookingId], references: [bookings.id] }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  assignee: one(users, { fields: [activities.assigneeId], references: [users.id] }),
}));

export const bookingLegsRelations = relations(bookingLegs, ({ one }) => ({
  booking: one(bookings, { fields: [bookingLegs.bookingId], references: [bookings.id] }),
  vessel: one(vessels, { fields: [bookingLegs.vesselId], references: [vessels.id] }),
}));
