CREATE TABLE "bank_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"archived_by" uuid,
	"archived_reason" text,
	"account" text NOT NULL,
	"source" text NOT NULL,
	"file" text,
	"closing_date" date,
	"closing_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "bank_statements_account_idx" ON "bank_statements" USING btree ("account","closing_date");