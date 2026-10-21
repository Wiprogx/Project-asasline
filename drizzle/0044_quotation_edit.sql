ALTER TABLE "quotations" ADD COLUMN "commodity" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "doc_type" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "declined_reason" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "status_before_cancel" "quotation_status";