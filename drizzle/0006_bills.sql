CREATE TYPE "public"."payment_direction" AS ENUM('in', 'out');--> statement-breakpoint
ALTER TYPE "public"."invoice_kind" ADD VALUE 'bill';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "supplier_ref" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "direction" "payment_direction" DEFAULT 'in' NOT NULL;