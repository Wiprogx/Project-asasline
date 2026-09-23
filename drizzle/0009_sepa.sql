CREATE TABLE "sepa_batch_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"batch_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"iban" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sepa_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"msg_id" text NOT NULL,
	"execution_date" date NOT NULL,
	"total_cents" integer NOT NULL,
	"xml" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sepa_batch_items" ADD CONSTRAINT "sepa_batch_items_batch_id_sepa_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."sepa_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sepa_batch_items" ADD CONSTRAINT "sepa_batch_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sepa_items_batch_idx" ON "sepa_batch_items" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "sepa_items_invoice_idx" ON "sepa_batch_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sepa_batches_msg_uq" ON "sepa_batches" USING btree ("msg_id");