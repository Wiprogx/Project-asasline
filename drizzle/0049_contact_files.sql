CREATE TABLE "contact_files" (
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
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"stored_name" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "contact_files" ADD CONSTRAINT "contact_files_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_files_contact_idx" ON "contact_files" USING btree ("contact_id");