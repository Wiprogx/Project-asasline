ALTER TABLE "rate_items" ALTER COLUMN "rate_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "rate_items" ALTER COLUMN "rate_type" SET DEFAULT 'contract';--> statement-breakpoint
DROP TYPE "public"."rate_type";