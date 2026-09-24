CREATE TYPE "public"."quotation_display" AS ENUM('itemized', 'inclusive');--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD COLUMN "listed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "display" "quotation_display" DEFAULT 'itemized' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "sent_on" date;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "sent_via" text;