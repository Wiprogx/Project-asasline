ALTER TABLE "quotation_lines" ALTER COLUMN "per_box" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD COLUMN "condition" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_routes" ADD COLUMN "boxes" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "rate_items" ADD COLUMN "free_kind" text;--> statement-breakpoint
ALTER TABLE "rate_items" ADD COLUMN "side" text;--> statement-breakpoint
-- Every existing line was a whole-destination line: it applies to every container; a free-time line is a term.
UPDATE "quotation_lines" SET "per_box" = true;--> statement-breakpoint
UPDATE "quotation_lines" l SET "condition" = true FROM "rate_items" i WHERE l."item_id" = i."id" AND i."category" = 'freetime';
