ALTER TABLE "bookings" ALTER COLUMN "doc_type_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "doc_type";--> statement-breakpoint
ALTER TABLE "quotations" DROP COLUMN "doc_type";