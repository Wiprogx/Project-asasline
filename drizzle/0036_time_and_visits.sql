CREATE TABLE "time_log" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"app" text NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "time_log_user_id_day_app_pk" PRIMARY KEY("user_id","day","app")
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"kind" text NOT NULL,
	"record_id" uuid NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	"last_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visits_user_id_day_kind_record_id_pk" PRIMARY KEY("user_id","day","kind","record_id")
);
--> statement-breakpoint
CREATE INDEX "visits_record_idx" ON "visits" USING btree ("kind","record_id");