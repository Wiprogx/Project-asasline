ALTER TABLE "invoice_lines" ADD COLUMN "credit_of_line_id" uuid;--> statement-breakpoint
CREATE INDEX "invoice_lines_credit_of_idx" ON "invoice_lines" USING btree ("credit_of_line_id");