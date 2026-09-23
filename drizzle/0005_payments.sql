CREATE TYPE "public"."bank_line_state" AS ENUM('open', 'matched', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank', 'cash', 'card', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('posted', 'reversed');--> statement-breakpoint
CREATE TABLE "bank_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"dedup_key" text NOT NULL,
	"source" text NOT NULL,
	"account" text,
	"date" date NOT NULL,
	"amount_cents" integer NOT NULL,
	"name" text,
	"iban" text,
	"comm" text,
	"ogm" text,
	"state" "bank_line_state" DEFAULT 'open' NOT NULL,
	"payment_id" uuid,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"payment_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"status" "payment_status" DEFAULT 'posted' NOT NULL,
	"contact_id" uuid,
	"date" date NOT NULL,
	"amount_cents" integer NOT NULL,
	"method" "payment_method" DEFAULT 'bank' NOT NULL,
	"reference" text,
	"bank_line_id" uuid,
	"diff_cents" integer DEFAULT 0 NOT NULL,
	"diff_account" text,
	"reversed_on" date,
	"reversal_reason" text
);
--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bank_lines_dedup_uq" ON "bank_lines" USING btree ("dedup_key");--> statement-breakpoint
CREATE INDEX "bank_lines_state_idx" ON "bank_lines" USING btree ("state","date");--> statement-breakpoint
CREATE INDEX "allocations_invoice_idx" ON "payment_allocations" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "allocations_payment_idx" ON "payment_allocations" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payments_contact_idx" ON "payments" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "payments_date_idx" ON "payments" USING btree ("date");