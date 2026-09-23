CREATE TABLE "vat_filings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"period" text NOT NULL,
	"grids" jsonb NOT NULL,
	"balance_cents" integer NOT NULL,
	"filed_by" uuid NOT NULL,
	"filed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "vat_filings_period_uq" ON "vat_filings" USING btree ("period");