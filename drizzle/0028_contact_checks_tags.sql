ALTER TABLE "contacts" ADD COLUMN "vat_checked_on" date;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "eori_checked_on" date;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "tags" text[] DEFAULT '{}'::text[] NOT NULL;