CREATE TABLE "accrual_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"on_date" date NOT NULL,
	"total_cents" integer NOT NULL,
	"lines" jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "accrual_runs_live_uq" ON "accrual_runs" USING btree ("on_date") WHERE archived_at is null;