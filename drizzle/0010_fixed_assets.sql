CREATE TABLE "fixed_assets" (
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
	"invoice_id" uuid NOT NULL,
	"invoice_line_id" uuid,
	"acquired_on" date NOT NULL,
	"cost_cents" integer NOT NULL,
	"years" integer NOT NULL,
	"account" text NOT NULL,
	"disposed_on" date,
	"dispose_note" text
);
--> statement-breakpoint
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fixed_assets_invoice_idx" ON "fixed_assets" USING btree ("invoice_id");