CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"ref" text NOT NULL,
	"date" date NOT NULL,
	"label" text NOT NULL,
	"lines" jsonb NOT NULL,
	"reversal_of" uuid
);
--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entries_ref_uq" ON "journal_entries" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "journal_entries_date_idx" ON "journal_entries" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entries_reversal_uq" ON "journal_entries" USING btree ("reversal_of");