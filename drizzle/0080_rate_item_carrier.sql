ALTER TABLE "rate_items" ADD COLUMN "carrier_id" uuid;--> statement-breakpoint
ALTER TABLE "rate_items" ADD CONSTRAINT "rate_items_carrier_id_contacts_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The professions the catalogue picks a contact by get their codes (a renamed row still found).
UPDATE "professions" SET "code" = 'carrier' WHERE lower("label") = 'carrier' AND "archived_at" IS NULL AND "code" IS NULL;
--> statement-breakpoint
UPDATE "professions" SET "code" = 'transporter' WHERE lower("label") = 'transporter' AND "archived_at" IS NULL AND "code" IS NULL;
--> statement-breakpoint
INSERT INTO "professions" ("label", "position", "code") SELECT 'Carrier', 30, 'carrier' WHERE NOT EXISTS (SELECT 1 FROM "professions" WHERE "code" = 'carrier');
--> statement-breakpoint
INSERT INTO "professions" ("label", "position", "code") SELECT 'Transporter', 20, 'transporter' WHERE NOT EXISTS (SELECT 1 FROM "professions" WHERE "code" = 'transporter');
--> statement-breakpoint
-- A carrier named in words becomes the contact of that name; words no contact carries stay in the note.
UPDATE "rate_items" r SET "carrier_id" = c."id" FROM "contacts" c
WHERE r."carrier" IS NOT NULL AND c."archived_at" IS NULL AND lower(c."name") = lower(btrim(r."carrier"));
--> statement-breakpoint
UPDATE "rate_items" SET "note" = concat_ws(E'\n', "note", 'Carrier before the contact link: ' || btrim("carrier"))
WHERE "carrier" IS NOT NULL AND btrim("carrier") <> '' AND "carrier_id" IS NULL;
