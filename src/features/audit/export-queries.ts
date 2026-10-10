import "server-only";
import { requirePermission } from "@/server/auth/dal";
import { db } from "@/server/db/client";
import * as t from "@/server/db/schema";

/**
 * A full copy of the office (legacy "a copy of everything"): every business table as it
 * stands, for the accountant, a migration or a backup. People come with their name and role
 * only — never a password hash or a session; the audit log has its own screen.
 */
const TABLES = {
  contacts: t.contacts,
  contactAddresses: t.contactAddresses,
  contactBankAccounts: t.contactBankAccounts,
  quotations: t.quotations,
  quotationRoutes: t.quotationRoutes,
  quotationLines: t.quotationLines,
  bookings: t.bookings,
  containers: t.containers,
  bookingFiles: t.bookingFiles,
  requirementReviews: t.requirementReviews,
  vessels: t.vessels,
  activities: t.activities,
  covers: t.covers,
  messages: t.messages,
  messageFiles: t.messageFiles,
  invoices: t.invoices,
  invoiceLines: t.invoiceLines,
  invoiceFiles: t.invoiceFiles,
  invoiceReminders: t.invoiceReminders,
  billLineMemory: t.billLineMemory,
  payments: t.payments,
  paymentAllocations: t.paymentAllocations,
  bankLines: t.bankLines,
  bankStatements: t.bankStatements,
  sepaBatches: t.sepaBatches,
  sepaBatchItems: t.sepaBatchItems,
  fixedAssets: t.fixedAssets,
  accrualRuns: t.accrualRuns,
  openingBalances: t.openingBalances,
  vatFilings: t.vatFilings,
  rateItems: t.rateItems,
  priceLists: t.priceLists,
  priceListLines: t.priceListLines,
  configTables: t.configTables,
  timeLog: t.timeLog,
  visits: t.visits,
  sequences: t.sequences,
} as const;

export async function officeCopy() {
  await requirePermission("app.settings");
  const tables: Record<string, unknown[]> = {};
  for (const [name, table] of Object.entries(TABLES)) tables[name] = await db.select().from(table);
  tables.users = await db
    .select({
      id: t.users.id,
      name: t.users.name,
      email: t.users.email,
      role: t.users.role,
      active: t.users.active,
    })
    .from(t.users);
  return { exportedAt: new Date().toISOString(), tables };
}
