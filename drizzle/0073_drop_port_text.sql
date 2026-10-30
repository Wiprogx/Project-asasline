-- No port is lost: every port a record named in words is now a row it points at (0072); a
-- legacy "?" (no port known) becomes none.
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(DISTINCT w, ', ') INTO missing FROM (
    SELECT 'quotation_routes ' || "pol" AS w FROM "quotation_routes" WHERE btrim(coalesce("pol", '')) NOT IN ('', '?') AND "pol_id" IS NULL
    UNION ALL SELECT 'quotation_routes ' || "pod" FROM "quotation_routes" WHERE btrim(coalesce("pod", '')) NOT IN ('', '?') AND "pod_id" IS NULL
    UNION ALL SELECT 'bookings ' || "pol" FROM "bookings" WHERE btrim(coalesce("pol", '')) NOT IN ('', '?') AND "pol_id" IS NULL
    UNION ALL SELECT 'bookings ' || "pod" FROM "bookings" WHERE btrim(coalesce("pod", '')) NOT IN ('', '?') AND "pod_id" IS NULL
    UNION ALL SELECT 'rate_items ' || "pol" FROM "rate_items" WHERE btrim(coalesce("pol", '')) NOT IN ('', '?') AND "pol_id" IS NULL
    UNION ALL SELECT 'rate_items ' || "pod" FROM "rate_items" WHERE btrim(coalesce("pod", '')) NOT IN ('', '?') AND "pod_id" IS NULL
    UNION ALL SELECT 'vessels ' || "pol" FROM "vessels" WHERE btrim(coalesce("pol", '')) NOT IN ('', '?') AND "pol_id" IS NULL
    UNION ALL SELECT 'vessels ' || "pod" FROM "vessels" WHERE btrim(coalesce("pod", '')) NOT IN ('', '?') AND "pod_id" IS NULL
  ) x;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Ports named in words that match no port (add them in ports, then run again): %', missing;
  END IF;
END $$;--> statement-breakpoint
DROP INDEX "rate_items_pod_idx";--> statement-breakpoint
CREATE INDEX "rate_items_pod_idx" ON "rate_items" USING btree ("pod_id");--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "pol";--> statement-breakpoint
ALTER TABLE "bookings" DROP COLUMN "pod";--> statement-breakpoint
ALTER TABLE "quotation_routes" DROP COLUMN "pol";--> statement-breakpoint
ALTER TABLE "quotation_routes" DROP COLUMN "pod";--> statement-breakpoint
ALTER TABLE "rate_items" DROP COLUMN "pol";--> statement-breakpoint
ALTER TABLE "rate_items" DROP COLUMN "pod";--> statement-breakpoint
ALTER TABLE "vessels" DROP COLUMN "pol";--> statement-breakpoint
ALTER TABLE "vessels" DROP COLUMN "pod";