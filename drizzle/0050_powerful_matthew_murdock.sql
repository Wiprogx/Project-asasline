ALTER TYPE "public"."contact_type" ADD VALUE 'location';--> statement-breakpoint
CREATE TABLE "contact_links" (
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
	"linked_id" uuid NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "salutation" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "passport_number" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "site_ref" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "opening_hours" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "contact_links" ADD CONSTRAINT "contact_links_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_links" ADD CONSTRAINT "contact_links_linked_id_contacts_id_fk" FOREIGN KEY ("linked_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_links_contact_idx" ON "contact_links" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_links_linked_idx" ON "contact_links" USING btree ("linked_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_links_live_uq" ON "contact_links" USING btree ("contact_id","linked_id","role") WHERE archived_at is null;