CREATE TYPE "public"."activity_state" AS ENUM('open', 'done', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('quote', 'sent', 'confirmed', 'in_transit', 'customs', 'arrived', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."contact_type" AS ENUM('company', 'person');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('draft', 'sent', 'accepted', 'declined', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'docs_clerk', 'accountant', 'team_lead');--> statement-breakpoint
CREATE TYPE "public"."shipment_kind" AS ENUM('export', 'import', 'both');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity" text,
	"entity_id" text,
	"detail" jsonb,
	"ip" text
);
--> statement-breakpoint
CREATE TABLE "config_tables" (
	"name" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "sequences" (
	"key" text PRIMARY KEY NOT NULL,
	"value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "role" NOT NULL,
	"password_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"contact_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text,
	"street" text,
	"zip" text,
	"city" text,
	"country" char(2),
	"phone" text,
	"email" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "contact_bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"contact_id" uuid NOT NULL,
	"iban" text NOT NULL,
	"bic" text,
	"label" text
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"name" text NOT NULL,
	"type" "contact_type" DEFAULT 'company' NOT NULL,
	"professions" text[] DEFAULT '{}'::text[] NOT NULL,
	"country" char(2),
	"lang" text DEFAULT 'en' NOT NULL,
	"vat" text,
	"eori" text,
	"phone" text,
	"mobile" text,
	"whatsapp" text,
	"email" text,
	"website" text,
	"street" text,
	"zip" text,
	"city" text,
	"credit_limit_cents" integer,
	"uses_last_price" boolean DEFAULT false NOT NULL,
	"payment_term_id" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"ref" text NOT NULL,
	"quotation_id" uuid,
	"kind" "shipment_kind" DEFAULT 'export' NOT NULL,
	"status" "booking_status" DEFAULT 'confirmed' NOT NULL,
	"client_id" uuid NOT NULL,
	"payer_id" uuid,
	"shipper_id" uuid,
	"consignee_id" uuid,
	"notify_id" uuid,
	"pol" text,
	"pod" text,
	"load_address" text,
	"load_date" date,
	"load_time" text,
	"carrier_booking_no" text,
	"bl_no" text,
	"doc_type" text DEFAULT 'SEA WAYBILL' NOT NULL,
	"vessel_name" text,
	"voyage" text,
	"etd" date,
	"eta" date,
	"commodity" text,
	"cancel_reason" text,
	"status_before_cancel" "booking_status"
);
--> statement-breakpoint
CREATE TABLE "containers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"booking_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"number" text,
	"type" text DEFAULT '40HC' NOT NULL,
	"seals" text[] DEFAULT '{}'::text[] NOT NULL,
	"tare_kg" integer,
	"cargo_kg" integer
);
--> statement-breakpoint
CREATE TABLE "quotation_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"route_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"item_code" text,
	"description" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"per_box" boolean DEFAULT false NOT NULL,
	"sell_cents" integer,
	"cost_cents" integer,
	"vat_code" text DEFAULT 'EX41' NOT NULL,
	"price_source" text
);
--> statement-breakpoint
CREATE TABLE "quotation_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"quotation_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"pol" text NOT NULL,
	"pod" text NOT NULL,
	"final_place" text,
	"container_type" text,
	"declined" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"ref" text NOT NULL,
	"client_id" uuid NOT NULL,
	"status" "quotation_status" DEFAULT 'draft' NOT NULL,
	"valid_until" date,
	"payment_term_id" text,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"title" text NOT NULL,
	"assignee_id" uuid,
	"role" "role",
	"due" date,
	"rule_code" text,
	"state" "activity_state" DEFAULT 'open' NOT NULL,
	"withdraw_reason" text,
	"link_kind" text,
	"link_id" uuid
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_addresses" ADD CONSTRAINT "contact_addresses_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_bank_accounts" ADD CONSTRAINT "contact_bank_accounts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_contacts_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_payer_id_contacts_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_shipper_id_contacts_id_fk" FOREIGN KEY ("shipper_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_consignee_id_contacts_id_fk" FOREIGN KEY ("consignee_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_notify_id_contacts_id_fk" FOREIGN KEY ("notify_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "containers" ADD CONSTRAINT "containers_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_route_id_quotation_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."quotation_routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_routes" ADD CONSTRAINT "quotation_routes_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_client_id_contacts_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE INDEX "audit_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "contact_addresses_contact_idx" ON "contact_addresses" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_bank_contact_idx" ON "contact_bank_accounts" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contacts_name_idx" ON "contacts" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "contacts_vat_idx" ON "contacts" USING btree ("vat");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_ref_uq" ON "bookings" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "bookings_client_idx" ON "bookings" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "containers_booking_idx" ON "containers" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotations_ref_uq" ON "quotations" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "quotations_client_idx" ON "quotations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "activities_assignee_idx" ON "activities" USING btree ("assignee_id","state");--> statement-breakpoint
CREATE INDEX "activities_link_idx" ON "activities" USING btree ("link_kind","link_id");