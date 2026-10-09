CREATE INDEX "bookings_quotation_idx" ON "bookings" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "bookings_quotation_route_idx" ON "bookings" USING btree ("quotation_route_id");--> statement-breakpoint
CREATE INDEX "bookings_vessel_idx" ON "bookings" USING btree ("vessel_id");--> statement-breakpoint
CREATE INDEX "bookings_payer_idx" ON "bookings" USING btree ("payer_id");--> statement-breakpoint
CREATE INDEX "bookings_shipper_idx" ON "bookings" USING btree ("shipper_id");--> statement-breakpoint
CREATE INDEX "bookings_consignee_idx" ON "bookings" USING btree ("consignee_id");--> statement-breakpoint
CREATE INDEX "bookings_notify_idx" ON "bookings" USING btree ("notify_id");--> statement-breakpoint
CREATE INDEX "quotation_lines_route_idx" ON "quotation_lines" USING btree ("route_id","position");--> statement-breakpoint
CREATE INDEX "quotation_lines_item_idx" ON "quotation_lines" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "quotation_routes_quotation_idx" ON "quotation_routes" USING btree ("quotation_id","position");--> statement-breakpoint
CREATE INDEX "activities_state_due_idx" ON "activities" USING btree ("state","due");--> statement-breakpoint
CREATE INDEX "messages_link_id_idx" ON "messages" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "messages_waiting_idx" ON "messages" USING btree ("at") WHERE direction = 'in' and claimed_by is null and archived_at is null;--> statement-breakpoint
CREATE INDEX "invoice_lines_source_idx" ON "invoice_lines" USING btree ("source_key");--> statement-breakpoint
CREATE INDEX "invoices_credit_of_idx" ON "invoices" USING btree ("credit_of_id");--> statement-breakpoint
CREATE INDEX "invoices_issue_date_idx" ON "invoices" USING btree ("status","issue_date");