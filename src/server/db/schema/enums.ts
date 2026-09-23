import { VESSEL_STATUSES } from "../../../domain/vessels";
import { pgEnum } from "drizzle-orm/pg-core";
import { CONTACT_TYPES } from "../../../domain/contacts";
import { ROLES } from "../../../domain/permissions";
import { BOOKING_STATUSES, QUOTATION_STATUSES, SHIPMENT_KINDS } from "../../../domain/shipments";

/** Database enums are generated from the domain vocabulary, so the two cannot drift. */
export const roleEnum = pgEnum("role", ROLES);
export const contactTypeEnum = pgEnum("contact_type", CONTACT_TYPES);
export const bookingStatusEnum = pgEnum("booking_status", BOOKING_STATUSES);
export const shipmentKindEnum = pgEnum("shipment_kind", SHIPMENT_KINDS);
export const quotationStatusEnum = pgEnum("quotation_status", QUOTATION_STATUSES);
export const activityStateEnum = pgEnum("activity_state", ["open", "done", "withdrawn"]);
export const vesselStatusEnum = pgEnum("vessel_status", VESSEL_STATUSES);
