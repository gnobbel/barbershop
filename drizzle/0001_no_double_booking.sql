-- The database itself refuses two confirmed bookings that overlap in time,
-- so simultaneous clicks on the same slot can never both succeed.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (tstzrange("start_at", "end_at", '[)') WITH &&)
  WHERE ("status" = 'confirmed');
--> statement-breakpoint
INSERT INTO "settings" ("id") VALUES (1) ON CONFLICT DO NOTHING;
