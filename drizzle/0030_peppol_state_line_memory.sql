CREATE TABLE "bill_line_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"key" text NOT NULL,
	"account" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "peppol_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "peppol_sent_by" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "via_peppol" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bill_line_memory" ADD CONSTRAINT "bill_line_memory_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bill_line_memory_uq" ON "bill_line_memory" USING btree ("contact_id","key");